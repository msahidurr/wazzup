"use client"

import { useEffect } from "react"
import { useFetcher, useLoaderData } from "react-router"
import { useAppBridge } from "@shopify/app-bridge-react"
import { boundary } from "@shopify/shopify-app-react-router/server"
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
    })

    if (!shop) {
      throw new Response("Shop not configured", { status: 404 })
    }

    const [messageLogs, templates, automations] = await Promise.all([
      prisma.messageLog.findMany({
        where: { shopId: shop.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.messageTemplate.count({ where: { shopId: shop.id } }),
      prisma.automationRule.count({ where: { shopId: shop.id } }),
    ])

    const totalSent = messageLogs.length
    const totalDelivered = messageLogs.filter((m) => m.status === "delivered").length
    const totalFailed = messageLogs.filter((m) => m.status === "failed").length
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0

    return {
      stats: {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate: Number.parseFloat(deliveryRate),
        templates,
        automations,
      },
    }
  } catch (error) {
    console.error("Error loading dashboard:", error)
    return {
      stats: {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        templates: 0,
        automations: 0,
      },
    }
  }
}

export default function DashboardIndex() {
  const fetcher = useFetcher()
  const shopify = useAppBridge()
  const { stats } = useLoaderData()
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST"

  useEffect(() => {
    if (fetcher.data?.product?.id) {
      shopify.toast.show("Product created")
    }
  }, [fetcher.data?.product?.id, shopify])
  const generateProduct = () => fetcher.submit({}, { method: "POST" })

  return (
    <s-page heading="WhatsApp Automation Dashboard">
      <s-section heading="Quick Stats">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.totalSent}</s-heading>
            <s-text>Messages Sent</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.totalDelivered}</s-heading>
            <s-text>Delivered</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{Number.parseFloat(stats.deliveryRate)}%</s-heading>
            <s-text>Delivery Rate</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.templates}</s-heading>
            <s-text>Templates</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.automations}</s-heading>
            <s-text>Active Automations</s-text>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Getting Started">
        <s-paragraph>Welcome to your WhatsApp Automation Dashboard! Here you can:</s-paragraph>
        <s-unordered-list>
          <s-list-item>Create and manage message templates</s-list-item>
          <s-list-item>Set up automation rules for orders, shipping, and more</s-list-item>
          <s-list-item>Monitor customer support chats</s-list-item>
          <s-list-item>View delivery analytics and message logs</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Quick Links">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/templates">Create a Template</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/automations">Set Up Automation</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/widget">Install Widget</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/settings">Configure WhatsApp</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="App template specs">
        <s-paragraph>
          <s-text>Framework: </s-text>
          <s-link href="https://reactrouter.com/" target="_blank">
            React Router
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Interface: </s-text>
          <s-link href="https://shopify.dev/docs/api/app-home/using-polaris-components" target="_blank">
            Polaris web components
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>API: </s-text>
          <s-link href="https://shopify.dev/docs/apps/tools/graphiql-admin-api" target="_blank">
            GraphQL
          </s-link>
        </s-paragraph>
        <s-paragraph>
          <s-text>Database: </s-text>
          <s-link href="https://www.prisma.io/" target="_blank">
            Prisma
          </s-link>
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Next steps">
        <s-unordered-list>
          <s-list-item>
            Build an{" "}
            <s-link href="https://shopify.dev/docs/apps/getting-started/build-app-example" target="_blank">
              example app
            </s-link>
          </s-list-item>
          <s-list-item>
            Explore Shopify&apos;s API with{" "}
            <s-link href="https://shopify.dev/docs/apps/tools/graphiql-admin-api" target="_blank">
              GraphiQL
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  )
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs)
}
