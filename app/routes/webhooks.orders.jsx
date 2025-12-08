import { PrismaClient } from "@prisma/client"
import { sendWhatsAppMessage } from "../utils/whatsapp-api.server.js"

const prisma = new PrismaClient()

export async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const payload = await request.json()
    const shopDomain = request.headers.get("X-Shopify-Shop-Domain")

    if (!shopDomain) {
      return Response.json({ error: "Invalid shop domain" }, { status: 400 })
    }

    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      include: { whatsappCredentials: true },
    })

    if (!shop) {
      return Response.json({ error: "Shop not found" }, { status: 404 })
    }

    const credential = shop.whatsappCredentials[0]
    if (!credential?.isActive) {
      return Response.json({ error: "WhatsApp not configured" }, { status: 400 })
    }

    if (payload.topic === "orders/create") {
      const customerPhone = payload.phone?.replace(/\D/g, "")
      if (!customerPhone) {
        return Response.json({ success: true })
      }

      const automations = await prisma.automationRule.findMany({
        where: {
          shopId: shop.id,
          trigger: "order_created",
          isActive: true,
        },
        include: { template: true },
      })

      for (const automation of automations) {
        if (automation.template) {
          let messageContent = automation.template.content
          messageContent = messageContent.replace("{{order_id}}", payload.name)
          messageContent = messageContent.replace("{{customer_name}}", payload.contact?.name || "Customer")
          messageContent = messageContent.replace("{{amount}}", `$${payload.total_price}`)

          const messageLog = await prisma.messageLog.create({
            data: {
              shopId: shop.id,
              templateId: automation.templateId,
              recipientPhone: `+${customerPhone}`,
              recipientName: payload.contact?.name || "Customer",
              messageContent,
              status: "pending",
            },
          })

          try {
            const response = await sendWhatsAppMessage(
              credential.accessToken,
              credential.phoneNumberId,
              `+${customerPhone}`,
              messageContent,
            )

            await prisma.messageLog.update({
              where: { id: messageLog.id },
              data: {
                externalMessageId: response.messages[0].id,
                status: "sent",
              },
            })
          } catch (error) {
            await prisma.messageLog.update({
              where: { id: messageLog.id },
              data: {
                status: "failed",
                errorMessage: error.message,
              },
            })
          }
        }
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
