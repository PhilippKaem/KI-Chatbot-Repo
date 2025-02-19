// Wartet, bis das DOM geladen ist, bevor wir Event-Listener setzen
document.addEventListener("DOMContentLoaded", () => {
    const chatMessages = document.getElementById("chat-messages");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const newChatButton = document.querySelector(".new-chat-btn");
    const chatSessionsContainer = document.getElementById("chat-sessions");
  
    // Aktueller Chatverlauf (nicht archiviert)
    let currentChatSession = [];
  
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
  
    // Sendet die Benutzernachricht und ruft die Bot-Antwort ab
    async function postChatMessage() {
      const userMessage = userInput.value.trim();
      if (!userMessage) return;
      addMessage(userMessage, "user");
      userInput.value = "";
  
      try {
        const botResponse = await askChatbot(userMessage);
        addMessage(botResponse, "bot");
      } catch (error) {
        console.error("Fehler beim Abrufen der Antwort:", error);
        addMessage("Fehler: Die Antwort konnte nicht abgerufen werden.", "bot");
      }
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
  
    // Archiviert den aktuellen Chat und startet einen neuen Chat
    function newChat() {
      if (currentChatSession.length > 0) {
        let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
        archived.push({
          timestamp: new Date().toISOString(),
          messages: currentChatSession
        });
        localStorage.setItem("chatSessions", JSON.stringify(archived));
      }
      currentChatSession = [];
      chatMessages.innerHTML = "";
      loadArchivedChats();
    }
  
    // Lädt alle archivierten Chats in die Sidebar und zeigt den Zeitstempel sowie
    // eine Vorschau (letzte User-Nachricht) an
    function loadArchivedChats() {
      chatSessionsContainer.innerHTML = "";
      let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
      archived.forEach((session, index) => {
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
          if (currentChatSession.length > 0 && 
              !confirm("Der aktuelle Chat ist nicht archiviert. Möchtest du fortfahren und den archivierten Chat laden?")) {
            return;
          }
          loadChatSession(index);
        });
        chatSessionsContainer.appendChild(sessionLink);
      });
    }
  
    // Lädt einen archivierten Chat (und entfernt ihn aus dem Archiv)
    function loadChatSession(index) {
      let archived = JSON.parse(localStorage.getItem("chatSessions")) || [];
      const session = archived[index];
      if (!session) return;
      chatMessages.innerHTML = "";
      currentChatSession = session.messages;
      session.messages.forEach(msg => {
        const messageWrapper = createMessageElement(msg.text, msg.sender);
        chatMessages.appendChild(messageWrapper);
      });
      chatMessages.scrollTop = chatMessages.scrollHeight;
      archived.splice(index, 1);
      localStorage.setItem("chatSessions", JSON.stringify(archived));
      loadArchivedChats();
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
  
    // Beim Laden der Seite werden die archivierten Chats in der Sidebar angezeigt
    loadArchivedChats();
  });
  