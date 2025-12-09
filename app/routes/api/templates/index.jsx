import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loader({ request, context }) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const { shopId } = context.session || {}
    if (!shopId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({ templates })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return Response.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}

export async function action({ request, context }) {
  const { shopId } = context.session || {}
  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (request.method === "POST") {
    const data = await request.json()
    try {
      const template = await prisma.messageTemplate.create({
        data: {
          ...data,
          shopId,
        },
      })
      return Response.json({ template }, { status: 201 })
    } catch (error) {
      console.error("Error creating template:", error)
      return Response.json({ error: "Failed to create template" }, { status: 500 })
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 })
}
