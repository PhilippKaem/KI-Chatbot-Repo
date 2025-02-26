// Wartet, bis das DOM geladen ist, bevor wir Event-Listener setzen
document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const newChatButton = document.querySelector(".new-chat-btn");
  const chatSessionsContainer = document.getElementById("chat-sessions");

  // Aktueller Chatverlauf (nicht archiviert)
  let currentChatSession = [];
  // Falls ein archivierter Chat geladen wurde, merken wir uns dessen Index
  let loadedArchiveIndex = null;

  // Erzeugt ein Nachrichten-Element inklusive Label
  function createMessageElement(text, sender) {
    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("message", sender); // => .message.user oder .message.bot

    // Label erstellen
    const label = document.createElement("div");
    label.classList.add("message-label");
    label.innerText = sender === "user" ? "User" : "Studienberater Bot";

    // Nachrichtentext
    const messageText = document.createElement("div");
    messageText.classList.add("message-content", sender);
    messageText.innerText = text;

    messageWrapper.appendChild(label);
    messageWrapper.appendChild(messageText);
    return messageWrapper;
  }

  // Fügt eine Nachricht dem Chat hinzu und speichert sie im aktuellen Verlauf
  function addMessage(text, sender) {
    const messageWrapper = createMessageElement(text, sender);
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    currentChatSession.push({ sender, text });
  }

  // Fügt eine Bot-Nachricht mit Lade-Animation ein und gibt den Container zurück
  function addBotLoadingMessage() {
    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("message", "bot");

    const label = document.createElement("div");
    label.classList.add("message-label");
    label.innerText = "Studienberater Bot";

    const content = document.createElement("div");
    content.classList.add("message-content", "bot");
    // Ladeanimation: animierte Punkte (HTML-Code, CSS muss in styles.css eingebunden sein)
    content.innerHTML = `
      <div class="loading-dots">
        <div></div><div></div><div></div><div></div>
      </div>
    `;

    messageWrapper.appendChild(label);
    messageWrapper.appendChild(content);
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageWrapper;
  }

  // Kommuniziert mit deinem Flask/Ollama-Backend
  async function askChatbot(question) {
    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: question })
    });

    if (!response.ok) {
      throw new Error(`Server-Fehler: ${response.statusText}`);
    }
    const data = await response.json();
    return data.answer;
  }

  // Sendet die Benutzernachricht und ruft die Bot-Antwort ab (inkl. Ladeanimation)
  async function postChatMessage() {
    const userMessage = userInput.value.trim();
    if (!userMessage) return;
    addMessage(userMessage, "user");
    userInput.value = "";

    // Füge Lade-Animation als Bot-Nachricht hinzu
    const loadingMessageWrapper = addBotLoadingMessage();

    try {
      const botResponse = await askChatbot(userMessage);
      // Ersetze den Inhalt der Lade-Nachricht mit der tatsächlichen Antwort
      const contentDiv = loadingMessageWrapper.querySelector(".message-content.bot");
      contentDiv.innerText = botResponse;
      currentChatSession.push({ sender: "bot", text: botResponse });
    } catch (error) {
      console.error("Fehler beim Abrufen der Antwort:", error);
      const contentDiv = loadingMessageWrapper.querySelector(".message-content.bot");
      contentDiv.innerText = "Fehler: Die Antwort konnte nicht abgerufen werden.";
      currentChatSession.push({ sender: "bot", text: "Fehler: Die Antwort konnte nicht abgerufen werden." });
    }
  }

  // Speichert den aktuellen Chat im Archiv und entfernt ggf. einen fortgeführten archivierten Chat
  function saveCurrentChat() {
    if (currentChatSession.length > 0) {
      let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
      // Falls ein archivierter Chat geladen war, ersetzen wir ihn
      if (loadedArchiveIndex !== null) {
        archived[loadedArchiveIndex] = {
          timestamp: new Date().toISOString(),
          messages: currentChatSession
        };
        loadedArchiveIndex = null;
      } else {
        archived.push({
          timestamp: new Date().toISOString(),
          messages: currentChatSession
        });
      }
      localStorage.setItem("chatSessions", JSON.stringify(archived));
      loadArchivedChats();
    }
  }

  // Archiviert den aktuellen Chat und startet einen neuen Chat
  function newChat() {
    saveCurrentChat();
    currentChatSession = [];
    chatMessages.innerHTML = "";
  }

  // Löscht einen archivierten Chat anhand seines Indexes
  function deleteArchivedChat(index) {
    let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
    archived.splice(index, 1);
    localStorage.setItem("chatSessions", JSON.stringify(archived));
    loadArchivedChats();
  }

  // Lädt alle archivierten Chats in die Sidebar und zeigt den Zeitstempel sowie
  // eine Vorschau (letzte User-Nachricht) an; ergänzt um einen "X"-Button zum Löschen
  function loadArchivedChats() {
    chatSessionsContainer.innerHTML = "";
    let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
    archived.forEach((session, index) => {
      const sessionContainer = document.createElement("div");
      sessionContainer.classList.add("session-container");

      const sessionLink = document.createElement("a");
      sessionLink.href = "#";
      const date = new Date(session.timestamp);
      let displayText = date.toLocaleString();

      // Finde die letzte Nachricht vom User
      const lastUserMessage = session.messages.slice().reverse().find(msg => msg.sender === "user");
      if (lastUserMessage) {
        let msgText = lastUserMessage.text;
        if (msgText.length > 50) {
          msgText = msgText.slice(0, 50) + "...";
        }
        displayText += " - " + msgText;
      }
      sessionLink.innerText = displayText;
      sessionLink.dataset.index = index;
      sessionLink.addEventListener("click", (e) => {
        e.preventDefault();
        // Lade den archivierten Chat (ohne Bestätigungs-Popup)
        loadChatSession(index);
      });

      // Erstelle den "X"-Button zum Löschen
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("delete-session");
      deleteButton.innerText = "X";
      deleteButton.addEventListener("click", (e) => {
        e.stopPropagation(); // Verhindert das Auslösen des Click-Events vom Link
        if (confirm("Möchtest du diesen Chat wirklich löschen?")) {
          deleteArchivedChat(index);
        }
      });

      sessionContainer.appendChild(sessionLink);
      sessionContainer.appendChild(deleteButton);
      chatSessionsContainer.appendChild(sessionContainer);
    });
  }

  // Lädt einen archivierten Chat, bleibt aber im Archiv erhalten, bis er fortgeführt wird
  function loadChatSession(index) {
    let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
    const session = archived[index];
    if (!session) return;
    chatMessages.innerHTML = "";
    currentChatSession = session.messages.slice(); // Kopie des archivierten Chats
    session.messages.forEach(msg => {
      const messageWrapper = createMessageElement(msg.text, msg.sender);
      chatMessages.appendChild(messageWrapper);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
    loadedArchiveIndex = index;

      // Entferne 'selected' von allen Links und setze ihn für den ausgewählten Link
  document.querySelectorAll("#chat-sessions .session-container a").forEach(link => {
    link.classList.remove("selected");
  });
  const selectedLink = document.querySelector(`#chat-sessions .session-container a[data-index="${index}"]`);
  if (selectedLink) {
    selectedLink.classList.add("selected");
  }
  }
  

  // Event-Listener für Senden-Button und Enter-Taste
  sendButton.addEventListener("click", postChatMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      postChatMessage();
    }
  });
  newChatButton.addEventListener("click", newChat);

  // Automatisches Speichern beim Verlassen der Seite
  window.addEventListener("beforeunload", saveCurrentChat);

  // Beim Laden der Seite werden die archivierten Chats in der Sidebar angezeigt
  loadArchivedChats();
});
