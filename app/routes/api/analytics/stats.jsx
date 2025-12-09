import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loader({ request, context }) {
  const { shopId } = context.session || {}
  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const messageLogs = await prisma.messageLog.findMany({
      where: { shopId },
    })

    const totalSent = messageLogs.length
    const totalDelivered = messageLogs.filter((m) => m.status === "delivered").length
    const totalFailed = messageLogs.filter((m) => m.status === "failed").length

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(2) : 0
    const failureRate = totalSent > 0 ? ((totalFailed / totalSent) * 100).toFixed(2) : 0

    // Recovery stats (abandoned carts)
    const abandonedCartMessages = await prisma.messageLog.count({
      where: {
        shopId,
        template: { category: "abandoned_cart" },
      },
    })

    return Response.json({
      stats: {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate: Number.parseFloat(deliveryRate),
        failureRate: Number.parseFloat(failureRate),
        abandonedCartRecoveryAttempts: abandonedCartMessages,
      },
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
