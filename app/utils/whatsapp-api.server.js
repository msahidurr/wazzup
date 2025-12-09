export async function sendWhatsAppMessage(accessToken, phoneNumberId, recipientPhone, messageContent) {
  const url = `https://graph.instagram.com/v20.0/${phoneNumberId}/messages`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: {
          body: messageContent,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending WhatsApp message:", error)
    throw error
  }
}

export async function getWhatsAppMessageStatus(accessToken, messageId) {
  const url = `https://graph.instagram.com/v20.0/${messageId}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error getting message status:", error)
    throw error
  }
}

export async function sendTemplateMessage(accessToken, phoneNumberId, recipientPhone, templateName, variables = []) {
  const url = `https://graph.instagram.com/v20.0/${phoneNumberId}/messages`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: variables.map((v) => ({ type: "text", text: v })),
            },
          ],
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error sending template message:", error)
    throw error
  }
}

export async function markAsRead(accessToken, messageId) {
  const url = `https://graph.instagram.com/v20.0/${messageId}`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "read",
      }),
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error marking message as read:", error)
    throw error
  }
}

export async function sendInteractiveMessage(accessToken, phoneNumberId, recipientPhone, header, body, buttons) {
  const url = `https://graph.instagram.com/v20.0/${phoneNumberId}/messages`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "interactive",
        interactive: {
          type: "button",
          header: {
            type: "text",
            text: header,
          },
          body: {
            text: body,
          },
          action: {
            buttons: buttons.map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id,
                title: btn.title,
              },
            })),
          },
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error sending interactive message:", error)
    throw error
  }
}
