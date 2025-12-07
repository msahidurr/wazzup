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
    })

    const widgetScript = shop ? `https://${process.env.APP_URL}/api/widget/script?shopId=${shop.id}` : null

    return { shop, widgetScript }
  } catch (error) {
    console.error("Error loading widget page:", error)
    return { shop: null, widgetScript: null }
  }
}

export default function WidgetPage() {
  const { shop, widgetScript } = useLoaderData()
  const [copied, setCopied] = useState(false)

  const handleCopyScript = () => {
    if (widgetScript) {
      navigator.clipboard.writeText(`<script src="${widgetScript}"><\/script>`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <s-page heading="WhatsApp Widget">
      <s-section heading="Storefront Widget Installation">
        <s-paragraph>Add a WhatsApp chat button to your Shopify storefront with this simple script tag.</s-paragraph>

        {widgetScript ? (
          <>
            <s-section heading="Installation Code">
              <s-box padding="base" borderRadius="base" background="subdued" borderWidth="base">
                <pre style={{ margin: 0, overflow: "auto" }}>
                  <code>{`<script src="${widgetScript}"><\/script>`}</code>
                </pre>
              </s-box>
              <s-button onClick={handleCopyScript}>{copied ? "Copied!" : "Copy Code"}</s-button>
            </s-section>

            <s-section heading="How to Install">
              <s-unordered-list>
                <s-list-item>Go to your Shopify Admin Dashboard</s-list-item>
                <s-list-item>Navigate to Online Store → Themes</s-list-item>
                <s-list-item>Click "Edit code" on your active theme</s-list-item>
                <s-list-item>Find the {`<head>`} section in theme.liquid</s-list-item>
                <s-list-item>Paste the script tag before the closing {`</head>`}</s-list-item>
                <s-list-item>Save and publish</s-list-item>
              </s-unordered-list>
            </s-section>

            <s-section heading="Preview">
              <s-box padding="base" borderRadius="base" background="subdued">
                <s-paragraph>
                  The widget will appear as a green chat button in the bottom right corner of your store.
                </s-paragraph>
              </s-box>
            </s-section>
          </>
        ) : (
          <s-paragraph>Shop not found. Please ensure your store is properly configured.</s-paragraph>
        )}
      </s-section>

      <s-section heading="Widget Features">
        <s-unordered-list>
          <s-list-item>Customizable button appearance</s-list-item>
          <s-list-item>Mobile-responsive design</s-list-item>
          <s-list-item>Direct link to WhatsApp chat</s-list-item>
          <s-list-item>Lightweight and fast-loading</s-list-item>
          <s-list-item>Pre-filled message support</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  )
}
