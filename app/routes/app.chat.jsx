"use client"

import { useLoaderData, useFetcher } from "react-router"
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
    })

    if (!shop) {
      throw new Response("Shop not configured", { status: 404 })
    }

    const sessions = await prisma.chatSession.findMany({
      where: { shopId: shop.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
    return { sessions }
  } catch (error) {
    console.error("Error loading chat sessions:", error)
    return { sessions: [] }
  }
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request)
  const shopDomain = session?.shop

  if (!shopDomain) {
    throw new Response("Unauthorized", { status: 401 })
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
  })

  if (!shop) {
    return Response.json({ success: false, error: "Shop not found" }, { status: 404 })
  }

  if (request.method === "POST") {
    const formData = await request.formData()
    const actionType = formData.get("actionType")

    try {
      if (actionType === "send-message") {
        const sessionId = formData.get("sessionId")
        const content = formData.get("content")?.trim()

        if (!content) {
          return Response.json({ success: false, error: "Message cannot be empty" }, { status: 400 })
        }

        const chatSession = await prisma.chatSession.findUnique({
          where: { id: sessionId },
        })

        if (chatSession.shopId !== shop.id) {
          return Response.json({ success: false, error: "Unauthorized" }, { status: 403 })
        }

        const message = await prisma.chatMessage.create({
          data: {
            chatSessionId: sessionId,
            sender: "agent",
            content,
          },
        })

        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        })

        return Response.json({ success: true, message })
      }

      if (actionType === "close-session") {
        const sessionId = formData.get("sessionId")
        const session = await prisma.chatSession.update({
          where: { id: sessionId },
          data: { status: "closed" },
        })
        return Response.json({ success: true, session })
      }
    } catch (error) {
      console.error("Error:", error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
  }

  return Response.json({ success: false }, { status: 400 })
}

export default function ChatPage() {
  const { sessions: initialSessions } = useLoaderData()
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessions[0]?.id || null)
  const fetcher = useFetcher()
  const [sessions, setSessions] = useState(initialSessions)

  const currentSession = sessions.find((s) => s.id === selectedSessionId)

  return (
    <s-page heading="Customer Support Chat">
      <s-layout>
        <s-layout-section>
          <s-section heading={`Chat Sessions (${sessions.length})`}>
            {sessions.length === 0 ? (
              <s-paragraph>No chat sessions yet.</s-paragraph>
            ) : (
              <s-stack direction="block" gap="base">
                {sessions.map((session) => (
                  <s-box
                    key={session.id}
                    padding="base"
                    borderRadius="base"
                    background={selectedSessionId === session.id ? "subdued" : "transparent"}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <s-heading level="4">{session.customerName}</s-heading>
                    <s-text>{session.customerPhone}</s-text>
                    <s-badge status={session.status === "closed" ? "warning" : "success"}>{session.status}</s-badge>
                    <s-text appearance="subdued">{session.messages.length} messages</s-text>
                  </s-box>
                ))}
              </s-stack>
            )}
          </s-section>
        </s-layout-section>

        <s-layout-section>
          {currentSession && currentSession.status !== "closed" ? (
            <s-section heading={`Chat with ${currentSession.customerName}`}>
              <s-stack direction="block" gap="base">
                <s-box padding="base" borderRadius="base" background="subdued">
                  <s-stack direction="block" gap="base" style={{ maxHeight: "300px", overflow: "auto" }}>
                    {currentSession.messages.map((msg) => (
                      <s-box
                        key={msg.id}
                        padding="small"
                        borderRadius="base"
                        background={msg.sender === "agent" ? "highlight" : "subdued"}
                      >
                        <s-text>
                          <strong>{msg.sender === "agent" ? "You" : currentSession.customerName}:</strong>
                        </s-text>
                        <s-text>{msg.content}</s-text>
                        <s-text appearance="subdued" size="small">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </s-text>
                      </s-box>
                    ))}
                  </s-stack>
                </s-box>

                <fetcher.Form method="post">
                  <input type="hidden" name="sessionId" value={selectedSessionId} />
                  <input type="hidden" name="actionType" value="send-message" />
                  <s-form-layout>
                    <s-text-field
                      label="Message"
                      name="content"
                      multiline
                      placeholder="Type your response..."
                      disabled={fetcher.state === "submitting"}
                    />
                    <s-button-group>
                      <s-button submit disabled={fetcher.state === "submitting"}>
                        {fetcher.state === "submitting" ? "Sending..." : "Send"}
                      </s-button>
                      <s-button
                        variant="secondary"
                        onClick={() => {
                          fetcher.submit(
                            { sessionId: selectedSessionId, actionType: "close-session" },
                            { method: "POST" },
                          )
                        }}
                      >
                        Close Chat
                      </s-button>
                    </s-button-group>
                  </s-form-layout>
                </fetcher.Form>
              </s-stack>
            </s-section>
          ) : currentSession && currentSession.status === "closed" ? (
            <s-section heading="Chat Closed">
              <s-paragraph>This chat session has been closed.</s-paragraph>
            </s-section>
          ) : (
            <s-section heading="Select a chat session">
              <s-paragraph>Select a chat session to view and respond to messages.</s-paragraph>
            </s-section>
          )}
        </s-layout-section>
      </s-layout>
    </s-page>
  )
}
