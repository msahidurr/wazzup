export async function loader({ request }) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN || "verify_token_123"

  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 })
  }

  return Response.json({ error: "Invalid token" }, { status: 403 })
}
