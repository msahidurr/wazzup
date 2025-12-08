import { PrismaClient } from "@prisma/client"
import { authenticate } from "../../shopify.server"

const prisma = new PrismaClient()

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { shopDomain: shopId },
    })

    if (!shop) {
      return Response.json({ error: "Shop not found" }, { status: 404 })
    }

    const categories = await prisma.templateCategory.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "asc" },
    })

    return Response.json({ categories })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return Response.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopId = session?.shop

  if (!shopId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (request.method === "POST") {
    const { name, description } = await request.json()

    try {
      const shop = await prisma.shop.findUnique({
        where: { shopDomain: shopId },
      })

      if (!shop) {
        return Response.json({ error: "Shop not found" }, { status: 404 })
      }

      const category = await prisma.templateCategory.create({
        data: {
          name,
          description,
          shopId: shop.id,
        },
      })

      return Response.json({ category }, { status: 201 })
    } catch (error) {
      console.error("Error creating category:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 })
}
