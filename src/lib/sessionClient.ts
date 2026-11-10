"use client";

export const COOKIE_NAME = "udyam_session_token";
export const ORDER_COOKIE_NAME = "udyam_order_id";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Check URL parameters
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token") || params.get("sessionId");
  if (urlToken) {
    setSessionToken(urlToken);
    return urlToken;
  }

  // 2. Check Cookie
  const match = document.cookie.match(new RegExp("(^| )" + COOKIE_NAME + "=([^;]+)"));
  if (match && match[2]) return match[2];

  // 3. Check localStorage
  const local = localStorage.getItem(COOKIE_NAME);
  if (local) return local;

  return null;
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined" || !token) return;
  // Set Cookie for 30 days
  const date = new Date();
  date.setTime(date.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `${COOKIE_NAME}=${token};path=/;expires=${date.toUTCString()};SameSite=Lax`;
  localStorage.setItem(COOKIE_NAME, token);
}

export function getStoredOrderId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const urlOrder = params.get("orderId");
  if (urlOrder) {
    setStoredOrderId(urlOrder);
    return urlOrder;
  }

  const match = document.cookie.match(new RegExp("(^| )" + ORDER_COOKIE_NAME + "=([^;]+)"));
  if (match && match[2]) return match[2];

  return localStorage.getItem(ORDER_COOKIE_NAME);
}

export function setStoredOrderId(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  const date = new Date();
  date.setTime(date.getTime() + 30 * 24 * 60 * 60 * 1000);
  document.cookie = `${ORDER_COOKIE_NAME}=${orderId};path=/;expires=${date.toUTCString()};SameSite=Lax`;
  localStorage.setItem(ORDER_COOKIE_NAME, orderId);
}
