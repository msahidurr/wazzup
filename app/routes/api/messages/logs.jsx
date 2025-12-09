import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loader({ request, context }) {
  const { shopId } = context.session || {}
  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10)

  try {
    const logs = await prisma.messageLog.findMany({
      where: {
        shopId,
        ...(status && { status }),
      },
      include: { template: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    const total = await prisma.messageLog.count({
      where: { shopId, ...(status && { status }) },
    })

    return Response.json({ logs, total })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}
