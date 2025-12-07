import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const payload = await request.json()
    const shopDomain = request.headers.get("X-Shopify-Shop-Api-Family-Api-Version")
      ? request.headers.get("X-Shopify-Shop-Api-Family-Api-Version").split("/")[0]
      : null

    if (!shopDomain) {
      return Response.json({ error: "Invalid shop domain" }, { status: 400 })
    }

    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
    })

    if (!shop) {
      return Response.json({ error: "Shop not found" }, { status: 404 })
    }

    // Handle order.created event
    if (payload.topic === "orders/create") {
      const orderId = payload.id
      const customerEmail = payload.contact?.email
      const customerPhone = payload.contact?.phone

      // Trigger order confirmation automation
      const automations = await prisma.automationRule.findMany({
        where: {
          shopId: shop.id,
          trigger: "order_created",
          isActive: true,
        },
        include: { template: true },
      })

      for (const automation of automations) {
        if (automation.template && customerPhone) {
          await prisma.messageLog.create({
            data: {
              shopId: shop.id,
              templateId: automation.templateId,
              recipientPhone: customerPhone,
              recipientName: payload.contact?.name || "Customer",
              messageContent: automation.template.content,
              status: "pending",
            },
          })
          // TODO: Send message via WhatsApp API
        }
      }
    }

    // Handle order.updated (shipping tracking)
    if (payload.topic === "orders/updated") {
      const fulfillmentStatus = payload.fulfillment_status
      if (fulfillmentStatus === "shipped") {
        const customerPhone = payload.contact?.phone
        const automations = await prisma.automationRule.findMany({
          where: {
            shopId: shop.id,
            trigger: "order_shipped",
            isActive: true,
          },
          include: { template: true },
        })

        for (const automation of automations) {
          if (automation.template && customerPhone) {
            await prisma.messageLog.create({
              data: {
                shopId: shop.id,
                templateId: automation.templateId,
                recipientPhone: customerPhone,
                recipientName: payload.contact?.name || "Customer",
                messageContent: automation.template.content,
                status: "pending",
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
