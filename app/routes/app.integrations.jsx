"use client"

import { useLoaderData } from "react-router"
import { useState } from "react"
import { authenticate } from "../shopify.server"
import prisma from "../db.server"

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopDomain = session?.shop

  if (!shopDomain) {
    throw new Response("Unauthorized", { status: 401 })
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain },
      include: { whatsappCredentials: true },
    })

    if (!shop) {
      throw new Response("Shop not configured", { status: 404 })
    }

    const webhookUrl = `${process.env.SHOPIFY_APP_URL || "https://your-app.com"}/routes/webhooks/orders`

    return { shop, webhookUrl }
  } catch (error) {
    console.error("Error loading integrations:", error)
    return { shop: null, webhookUrl: null }
  }
}

export default function IntegrationsPage() {
  const { shop, webhookUrl } = useLoaderData()
  const [showWebhookGuide, setShowWebhookGuide] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
              <s-button href="/app/settings" variant="secondary">
                Manage Credentials
              </s-button>
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
              <s-heading level="3">Shopify Order Webhooks</s-heading>
              <s-paragraph>
                The app automatically listens for Shopify order events to trigger WhatsApp automations:
              </s-paragraph>
              <s-unordered-list>
                <s-list-item>Order Created - Sends order confirmation</s-list-item>
                <s-list-item>Order Updated - Triggers shipping notifications</s-list-item>
              </s-unordered-list>

              <s-heading level="3">WhatsApp Cloud API Webhooks</s-heading>
              <s-paragraph>
                To receive messages from customers, configure this URL in your Meta Business Account:
              </s-paragraph>
              <s-box padding="base" borderRadius="base" background="subdued" borderWidth="base">
                <pre style={{ margin: 0, overflow: "auto", wordBreak: "break-all" }}>
                  <code>{webhookUrl}</code>
                </pre>
              </s-box>
              <s-button onClick={handleCopyWebhook}>{copied ? "Copied!" : "Copy URL"}</s-button>

              <s-heading level="3">Webhook Setup Steps</s-heading>
              <s-unordered-list>
                <s-list-item>Go to your Meta Business Account</s-list-item>
                <s-list-item>Navigate to App Settings → Webhooks</s-list-item>
                <s-list-item>Add the webhook URL above</s-list-item>
                <s-list-item>Subscribe to: messages, message_status, message_template_status_update</s-list-item>
                <s-list-item>Verify your token (check environment variables)</s-list-item>
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
