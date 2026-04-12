export type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
};

export type Chat = {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  members: string[];
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
};

export type Contact = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  about: string;
};

export const contacts: Contact[] = [
  { id: "u1", name: "Alice Johnson", avatar: "AJ", email: "ok@ok.com", about: "Hey there! I'm using SecureChat" },
  { id: "u2", name: "Bob Smith", avatar: "BS", email: "bob@test.com", about: "Available" },
  { id: "u3", name: "Carol Davis", avatar: "CD", email: "carol@test.com", about: "At work" },
  { id: "u4", name: "Dan Wilson", avatar: "DW", email: "dan@test.com", about: "Busy" },
  { id: "u5", name: "Eve Martinez", avatar: "EM", email: "eve@test.com", about: "In a meeting" },
  { id: "u6", name: "Frank Lee", avatar: "FL", email: "frank@test.com", about: "On vacation 🌴" },
];

export const chats: Chat[] = [
  {
    id: "c1",
    name: "Project Alpha",
    avatar: "PA",
    isGroup: true,
    members: ["u1", "u2", "u3", "u4"],
    lastMessage: "Bob: I'll push the fix tonight",
    lastMessageTime: Date.now() - 1000 * 60 * 5,
    unreadCount: 3,
  },
  {
    id: "c2",
    name: "Carol Davis",
    avatar: "CD",
    isGroup: false,
    members: ["u1", "u3"],
    lastMessage: "See you tomorrow!",
    lastMessageTime: Date.now() - 1000 * 60 * 30,
    unreadCount: 0,
  },
  {
    id: "c3",
    name: "Weekend Plans",
    avatar: "WP",
    isGroup: true,
    members: ["u1", "u2", "u5", "u6"],
    lastMessage: "Eve: Count me in!",
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 2,
    unreadCount: 5,
  },
  {
    id: "c4",
    name: "Dan Wilson",
    avatar: "DW",
    isGroup: false,
    members: ["u1", "u4"],
    lastMessage: "Thanks for the help!",
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 5,
    unreadCount: 0,
  },
  {
    id: "c5",
    name: "Design Team",
    avatar: "DT",
    isGroup: true,
    members: ["u1", "u3", "u5"],
    lastMessage: "Carol: Updated the mockups",
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 24,
    unreadCount: 1,
  },
  {
    id: "c6",
    name: "Frank Lee",
    avatar: "FL",
    isGroup: false,
    members: ["u1", "u6"],
    lastMessage: "Sent you the docs",
    lastMessageTime: Date.now() - 1000 * 60 * 60 * 48,
    unreadCount: 0,
  },
];

const generateMessages = (chatId: string, members: string[]): Message[] => {
  const conversations: Record<string, Array<{ senderId: string; text: string }>> = {
    c1: [
      { senderId: "u3", text: "Hey team, how's the sprint going?" },
      { senderId: "u1", text: "Almost done with the auth module" },
      { senderId: "u2", text: "I'm stuck on the API integration" },
      { senderId: "u4", text: "Need help with anything Bob?" },
      { senderId: "u2", text: "Yeah, the token refresh is failing" },
      { senderId: "u1", text: "I had the same issue. Check the middleware config" },
      { senderId: "u3", text: "Let's do a quick call at 3?" },
      { senderId: "u2", text: "Works for me" },
      { senderId: "u4", text: "Same here" },
      { senderId: "u1", text: "Sure, I'll set it up" },
      { senderId: "u2", text: "Found the bug. It was a typo in the env var" },
      { senderId: "u3", text: "Nice catch! 🎉" },
      { senderId: "u2", text: "I'll push the fix tonight" },
    ],
    c2: [
      { senderId: "u3", text: "Hey Alice!" },
      { senderId: "u1", text: "Hi Carol! How are you?" },
      { senderId: "u3", text: "Good! Did you see the new designs?" },
      { senderId: "u1", text: "Yes, they look amazing" },
      { senderId: "u3", text: "Thanks! Want to review them together?" },
      { senderId: "u1", text: "Sure, tomorrow morning?" },
      { senderId: "u3", text: "See you tomorrow!" },
    ],
    c3: [
      { senderId: "u6", text: "Anyone up for hiking this weekend?" },
      { senderId: "u1", text: "That sounds great!" },
      { senderId: "u2", text: "Where were you thinking?" },
      { senderId: "u6", text: "Blue Ridge trail?" },
      { senderId: "u5", text: "Count me in!" },
    ],
    c4: [
      { senderId: "u4", text: "Hey, can you help me with the deployment?" },
      { senderId: "u1", text: "Sure, what's the issue?" },
      { senderId: "u4", text: "The Docker build keeps failing" },
      { senderId: "u1", text: "Check if the base image version matches" },
      { senderId: "u4", text: "That was it! Thanks for the help!" },
    ],
    c5: [
      { senderId: "u5", text: "New color palette is ready" },
      { senderId: "u1", text: "Love the blue tones" },
      { senderId: "u3", text: "Updated the mockups" },
    ],
    c6: [
      { senderId: "u6", text: "Hey Alice, got those docs?" },
      { senderId: "u1", text: "Which ones?" },
      { senderId: "u6", text: "The API documentation" },
      { senderId: "u1", text: "Sent you the docs" },
    ],
  };

  const msgs = conversations[chatId] || [];
  const baseTime = Date.now() - 1000 * 60 * 60 * 3;

  return msgs.map((m, i) => ({
    id: `${chatId}-m${i}`,
    chatId,
    senderId: m.senderId,
    text: m.text,
    timestamp: baseTime + i * 1000 * 60 * 5,
  }));
};

export const getMessages = (chatId: string): Message[] => {
  const chat = chats.find((c) => c.id === chatId);
  if (!chat) return [];
  return generateMessages(chatId, chat.members);
};

export const getContact = (id: string): Contact | undefined =>
  contacts.find((c) => c.id === id);
