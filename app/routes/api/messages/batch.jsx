import { PrismaClient } from "@prisma/client"
import { sendWhatsAppMessage } from "../../utils/whatsapp-api.server.js"

const prisma = new PrismaClient()

export async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const { shopId, templateId, recipients } = await request.json()

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
      include: { shop: { include: { whatsappCredentials: true } } },
    })

    if (!template) {
      return Response.json({ error: "Template not found" }, { status: 404 })
    }

    const credential = template.shop.whatsappCredentials[0]
    if (!credential || !credential.isActive) {
      return Response.json({ error: "WhatsApp credentials not configured" }, { status: 400 })
    }

    const results = []

    // Rate limiting: send 1 message per 50ms to avoid API throttling
    for (const recipient of recipients) {
      await new Promise((resolve) => setTimeout(resolve, 50))

      try {
        const response = await sendWhatsAppMessage(
          credential.accessToken,
          credential.phoneNumberId,
          recipient.phone,
          template.content,
        )

        const messageLog = await prisma.messageLog.create({
          data: {
            shopId: template.shopId,
            templateId,
            recipientPhone: recipient.phone,
            recipientName: recipient.name || "Customer",
            messageContent: template.content,
            status: "sent",
            externalMessageId: response.messages[0].id,
          },
        })

        results.push({ success: true, phone: recipient.phone, id: messageLog.id })
      } catch (error) {
        const messageLog = await prisma.messageLog.create({
          data: {
            shopId: template.shopId,
            templateId,
            recipientPhone: recipient.phone,
            recipientName: recipient.name || "Customer",
            messageContent: template.content,
            status: "failed",
            errorMessage: error.message,
          },
        })

        results.push({
          success: false,
          phone: recipient.phone,
          error: error.message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    return Response.json({
      success: true,
      total: recipients.length,
      sent: successCount,
      failed: recipients.length - successCount,
      results,
    })
  } catch (error) {
    console.error("Error in batch send:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
