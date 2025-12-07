"use client"

import { useLoaderData } from "react-router"
import { useState } from "react"
import { authenticate } from "../shopify.server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    throw new Response("Unauthorized", { status: 401 })
  }

  try {
    const shop = await prisma.shop.findFirst({
      where: { shopDomain: shopId },
      include: { whatsappCredentials: true },
    })

    return { shop }
  } catch (error) {
    console.error("Error loading integrations:", error)
    return { shop: null }
  }
}

export default function IntegrationsPage() {
  const { shop } = useLoaderData()
  const [showWebhookGuide, setShowWebhookGuide] = useState(false)

  const webhookUrl = `${process.env.APP_URL}/routes/api/webhooks/whatsapp`

  return (
    <s-page heading="Integrations">
      <s-section heading="WhatsApp Cloud API">
        {shop?.whatsappCredentials && shop.whatsappCredentials.length > 0 ? (
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                <strong>Status: </strong>
                <s-badge status={shop.whatsappCredentials[0].isActive ? "success" : "warning"}>
                  {shop.whatsappCredentials[0].isActive ? "Connected" : "Inactive"}
                </s-badge>
              </s-paragraph>
              <s-paragraph>
                <strong>Phone Number ID: </strong>
                {shop.whatsappCredentials[0].phoneNumberId}
              </s-paragraph>
              <s-button variant="secondary">Reconnect</s-button>
            </s-stack>
          </s-box>
        ) : (
          <s-paragraph>WhatsApp not connected. Go to settings to connect.</s-paragraph>
        )}
      </s-section>

      <s-section heading="Webhook Configuration">
        <s-button onClick={() => setShowWebhookGuide(!showWebhookGuide)}>
          {showWebhookGuide ? "Hide" : "Show"} Webhook Setup Guide
        </s-button>

        {showWebhookGuide && (
          <s-box padding="base" borderRadius="base" background="highlight">
            <s-stack direction="block" gap="base">
              <s-heading level="3">Set Up WhatsApp Webhooks</s-heading>
              <s-paragraph>
                To receive real-time updates from WhatsApp, configure your webhook URL in your Meta Business Account:
              </s-paragraph>
              <s-box padding="base" borderRadius="base" background="subdued" borderWidth="base">
                <s-code-block>{webhookUrl}</s-code-block>
              </s-box>
              <s-paragraph>
                <strong>Verify Token:</strong> Use <code>verify_token_123</code> (or set WHATSAPP_WEBHOOK_TOKEN env
                variable)
              </s-paragraph>
              <s-paragraph>
                <strong>Subscribe to these webhook fields:</strong>
              </s-paragraph>
              <s-unordered-list>
                <s-list-item>messages</s-list-item>
                <s-list-item>message_template_status_update</s-list-item>
                <s-list-item>message_status</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>
        )}
      </s-section>

      <s-section heading="API Documentation">
        <s-paragraph>
          For more information about WhatsApp Cloud API, visit the{" "}
          <s-link href="https://developers.facebook.com/docs/whatsapp/cloud-api/" target="_blank">
            official documentation
          </s-link>
          .
        </s-paragraph>
      </s-section>
    </s-page>
  )
}
