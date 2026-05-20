self.addEventListener("push", (event) => {
  let data = { title: "New message", body: "You have a new notification", url: "/" };
  try {
    if (event.data) data = event.data.json();
  } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title || "New message", {
      body: data.body || "",
      data: { url: data.url || "/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
