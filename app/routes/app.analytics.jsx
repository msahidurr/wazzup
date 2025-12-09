import { useLoaderData } from "react-router"
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
    const messageLogs = await prisma.messageLog.findMany({
      where: { shop: { shopDomain: shopId } },
    })

    const totalSent = messageLogs.length
    const totalDelivered = messageLogs.filter((m) => m.status === "delivered").length
    const totalFailed = messageLogs.filter((m) => m.status === "failed").length
    const totalPending = messageLogs.filter((m) => m.status === "pending").length

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0
    const failureRate = totalSent > 0 ? ((totalFailed / totalSent) * 100).toFixed(2) : 0

    // Recovery stats
    const abandonedCartMessages = await prisma.messageLog.count({
      where: {
        shop: { shopDomain: shopId },
        template: { category: "abandoned_cart" },
      },
    })

    const orderConfirmationMessages = await prisma.messageLog.count({
      where: {
        shop: { shopDomain: shopId },
        template: { category: "order_confirmation" },
      },
    })

    return {
      stats: {
        totalSent,
        totalDelivered,
        totalFailed,
        totalPending,
        deliveryRate: Number.parseFloat(deliveryRate),
        failureRate: Number.parseFloat(failureRate),
        abandonedCartRecovery: abandonedCartMessages,
        orderConfirmations: orderConfirmationMessages,
      },
      logs: messageLogs.slice(0, 50),
    }
  } catch (error) {
    console.error("Error loading analytics:", error)
    return {
      stats: {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalPending: 0,
        deliveryRate: 0,
        failureRate: 0,
      },
      logs: [],
    }
  }
}

export default function AnalyticsPage() {
  const { stats, logs } = useLoaderData()

  return (
    <s-page heading="Analytics & Reporting">
      <s-section heading="Delivery Statistics">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.totalSent}</s-heading>
            <s-text>Total Sent</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.totalDelivered}</s-heading>
            <s-text>Delivered</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.totalFailed}</s-heading>
            <s-text>Failed</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.totalPending}</s-heading>
            <s-text>Pending</s-text>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Performance Metrics">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.deliveryRate}%</s-heading>
            <s-text>Delivery Rate</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.failureRate}%</s-heading>
            <s-text>Failure Rate</s-text>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Recovery Statistics">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.abandonedCartRecovery}</s-heading>
            <s-text>Abandoned Cart Messages</s-text>
          </s-box>
          <s-box padding="base" borderRadius="base" background="subdued">
            <s-heading level="2">{stats.orderConfirmations}</s-heading>
            <s-text>Order Confirmations</s-text>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Recent Message Logs">
        {logs.length === 0 ? (
          <s-paragraph>No message logs yet.</s-paragraph>
        ) : (
          <s-resource-list
            resourceName={{ singular: "log", plural: "logs" }}
            items={logs}
            renderItem={(log) => (
              <s-resource-item id={log.id} accessibilityLabel={`Message to ${log.recipientPhone}`}>
                <s-heading level="3">{log.recipientName || log.recipientPhone}</s-heading>
                <s-text>Status: {log.status}</s-text>
                <s-text>{log.messageContent}</s-text>
              </s-resource-item>
            )}
          />
        )}
      </s-section>
    </s-page>
  )
}
