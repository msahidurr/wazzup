import { PrismaClient } from "@prisma/client"
import { sendWhatsAppMessage } from "../../utils/whatsapp-api.server.js"

const prisma = new PrismaClient()

export async function action({ request }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const { recipientPhone, templateId, variables = {} } = await request.json()

    // Get template
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

    // Replace variables in content
    let messageContent = template.content
    Object.entries(variables).forEach(([key, value]) => {
      messageContent = messageContent.replace(`{{${key}}}`, value)
    })

    // Create message log entry
    const messageLog = await prisma.messageLog.create({
      data: {
        shopId: template.shopId,
        templateId,
        recipientPhone,
        recipientName: variables.customerName || "Customer",
        messageContent,
        status: "pending",
      },
    })

    // Send via WhatsApp API
    try {
      const response = await sendWhatsAppMessage(
        credential.accessToken,
        credential.phoneNumberId,
        recipientPhone,
        messageContent,
      )

      // Update message log with external ID
      await prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          externalMessageId: response.messages[0].id,
          status: "sent",
        },
      })

      return Response.json({ success: true, messageId: response.messages[0].id })
    } catch (error) {
      await prisma.messageLog.update({
        where: { id: messageLog.id },
        data: {
          status: "failed",
          errorMessage: error.message,
        },
      })

      return Response.json({ error: "Failed to send message", details: error.message }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in send message endpoint:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
