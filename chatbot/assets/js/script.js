// Wartet, bis die komplette Seite geladen ist
document.addEventListener("DOMContentLoaded", () => {
  // Referenzen auf DOM-Elemente
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const newChatButton = document.querySelector(".new-chat-btn");
  const chatSessionsContainer = document.getElementById("chat-sessions");

  // Aktueller Verlauf und Session-Verwaltung
  let currentChatSession = [];
  let loadedArchiveIndex = null;
  let sessionId = generateSessionId(); // Erstellt eine eindeutige ID für jeden Chat

  // Erzeugt eine eindeutige Session-ID für neue Chats
  function generateSessionId() {
    return "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
  }

  // Erstellt eine einzelne Nachricht im DOM
  function createMessageElement(text, sender) {
    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("message", sender);

    const label = document.createElement("div");
    label.classList.add("message-label");
    label.innerText = sender === "user" ? "User" : "Studienberater Bot";

    const messageText = document.createElement("div");
    messageText.classList.add("message-content", sender);
    messageText.innerText = text;

    messageWrapper.appendChild(label);
    messageWrapper.appendChild(messageText);
    return messageWrapper;
  }

  // Fügt eine Nachricht dem Chatverlauf im DOM hinzu
  function addMessage(text, sender) {
    const messageWrapper = createMessageElement(text, sender);
    chatMessages.appendChild(messageWrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    currentChatSession.push({ sender, text });
  }

  // Zeigt animierte Ladepunkte an, während die Bot-Antwort geladen wird
  function addBotLoadingMessage() {
    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("message", "bot");

    const label = document.createElement("div");
    label.classList.add("message-label");
    label.innerText = "Studienberater Bot";

    const content = document.createElement("div");
    content.classList.add("message-content", "bot");
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

  // Sendet die Nutzerfrage an das Backend und erhält die Bot-Antwort
  async function askChatbot(question) {
    // Entscheidet, welche Session-ID verwendet wird:
    // Wenn ein Archiv geladen ist, nutze eine feste ID – sonst aktuelle Session-ID
    const usedSessionId = loadedArchiveIndex !== null
      ? `chat_${loadedArchiveIndex}`
      : sessionId;

    const response = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input: question, session_id: usedSessionId })
    });

    if (!response.ok) {
      throw new Error(`Server-Fehler: ${response.statusText}`);
    }

    const data = await response.json();
    return data.answer;
  }

  // Steuert den Ablauf, wenn eine Nachricht abgeschickt wird
  async function postChatMessage() {
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    // Zeige Nutzernachricht
    addMessage(userMessage, "user");
    userInput.value = "";

    // Zeige Ladeanzeige für Bot
    const loadingMessageWrapper = addBotLoadingMessage();

    try {
      const botResponse = await askChatbot(userMessage);

      // Ersetze Ladeanzeige durch Antworttext
      const contentDiv = loadingMessageWrapper.querySelector(".message-content.bot");
      contentDiv.innerText = botResponse;

      // Speichere Bot-Antwort im Verlauf
      currentChatSession.push({ sender: "bot", text: botResponse });
    } catch (error) {
      console.error("Fehler beim Abrufen der Antwort:", error);
      const contentDiv = loadingMessageWrapper.querySelector(".message-content.bot");
      contentDiv.innerText = "Fehler: Die Antwort konnte nicht abgerufen werden.";
      currentChatSession.push({ sender: "bot", text: "Fehler: Die Antwort konnte nicht abgerufen werden." });
    }
  }

  // Speichert den aktuellen Chatverlauf lokal im LocalStorage
  function saveCurrentChat() {
    if (currentChatSession.length > 0) {
      let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];

      // Überschreibt alten Chatverlauf, wenn Archiv geladen wurde
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

  // Startet einen neuen Chat (alte Session speichern, neues Fenster anzeigen)
  function newChat() {
    saveCurrentChat();
    currentChatSession = [];
    chatMessages.innerHTML = "";
    loadedArchiveIndex = null;
    sessionId = generateSessionId(); // Neue eindeutige ID für neue Chat-Sitzung
  }

  // Löscht einen gespeicherten Chat aus dem LocalStorage
  function deleteArchivedChat(index) {
    let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
    archived.splice(index, 1);
    localStorage.setItem("chatSessions", JSON.stringify(archived));
    loadArchivedChats();
  }

  // Zeigt alle gespeicherten Chatverläufe in der Seitenleiste an
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

      // Vorschau der letzten Nutzernachricht
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
        loadChatSession(index);
      });

      // "X"-Button zum Löschen des Chats
      const deleteButton = document.createElement("button");
      deleteButton.classList.add("delete-session");
      deleteButton.innerText = "X";
      deleteButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Möchtest du diesen Chat wirklich löschen?")) {
          deleteArchivedChat(index);
        }
      });

      sessionContainer.appendChild(sessionLink);
      sessionContainer.appendChild(deleteButton);
      chatSessionsContainer.appendChild(sessionContainer);
    });
  }

  // Lädt eine frühere Sitzung in den Chatbereich
  function loadChatSession(index) {
    let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
    const session = archived[index];
    if (!session) return;

    chatMessages.innerHTML = "";
    currentChatSession = session.messages.slice(); // Tiefkopie
    session.messages.forEach(msg => {
      const messageWrapper = createMessageElement(msg.text, msg.sender);
      chatMessages.appendChild(messageWrapper);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
    loadedArchiveIndex = index;

    // Visuelle Hervorhebung der aktuellen Sitzung
    document.querySelectorAll("#chat-sessions .session-container a").forEach(link => {
      link.classList.remove("selected");
    });
    const selectedLink = document.querySelector(`#chat-sessions .session-container a[data-index="${index}"]`);
    if (selectedLink) {
      selectedLink.classList.add("selected");
    }
  }

  // Event Listener für Buttons und Tastatur
  sendButton.addEventListener("click", postChatMessage);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      postChatMessage();
    }
  });
  newChatButton.addEventListener("click", newChat);

  // Speichert Chatverlauf beim Verlassen der Seite automatisch
  window.addEventListener("beforeunload", saveCurrentChat);

  // Archiv beim Laden anzeigen
  loadArchivedChats();
});
