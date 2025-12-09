import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loader({ request }) {
  const url = new URL(request.url)
  const shopId = url.searchParams.get("shopId")
  const widgetId = url.searchParams.get("widgetId")

  if (!shopId) {
    return Response.json({ error: "Missing shopId" }, { status: 400 })
  }

  try {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    })

    if (!shop) {
      return Response.json({ error: "Shop not found" }, { status: 404 })
    }

    // Return the widget script as JavaScript
    const script = `
(function() {
  const widgetId = '${widgetId || "whatsapp-widget"}';
  const shopId = '${shopId}';
  
  // Create widget container
  const container = document.createElement('div');
  container.id = widgetId;
  container.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #25D366 0%, #20BA5A 100%);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    transition: all 0.3s ease;
  \`;
  
  container.innerHTML = '💬';
  
  container.onmouseover = function() {
    this.style.transform = 'scale(1.1)';
    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
  };
  
  container.onmouseout = function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  
  container.onclick = function() {
    window.open('https://wa.me/?text=Hi%20there!', '_blank');
  };
  
  document.body.appendChild(container);
})();
    `.trim()

    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error generating widget script:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
