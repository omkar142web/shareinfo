const str = {
  _id: ObjectId,
  userId: ObjectId,
  title: "MongoDB Notes",
  slug: "mongodb-notes-ab12",
  blocks: [
    {
      id: "blk_1",
      type: "heading",
      content: {
        text: "MongoDB Basics",
        level: 1,
      },
      order: 1,
    },

    {
      id: "blk_2",
      type: "paragraph",
      content: {
        text: "MongoDB is a NoSQL database...",
      },
      order: 2,
    },

    {
      id: "blk_3",
      type: "code",
      content: {
        language: "javascript",
        code: "console.log('hello')",
      },
      order: 3,
    },

    {
      id: "blk_4",
      type: "link",
      content: {
        url: "https://mongodb.com",
        title: "MongoDB",
        description: "Official website",
        image: "",
      },
      order: 4,
    },
  ],

  tags: ["mongodb", "backend"],

  visibility: "public",
  // public | private | unlisted

  status: "published",
  // draft | published | archived

  stats: {
    views: 0,
    likes: 0,
    bookmarks: 0,
    shares: 0,
    comments: 0,
  },

  settings: {
    allowComments: true,
    allowCopy: true,
    showLineNumbers: true,
  },

  isDeleted: false,
  deletedAt: null,
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date,
};

const postSchema = {
  title: String,
  slug: { type: String, unique: true },
  // The magic happens here
  blocks: [
    {
      id: String, // Unique ID for frontend keys/reordering
      type: {
        type: String,
        enum: ["heading", "paragraph", "code", "link", "image"],
      },
      // Store all data in a single 'data' field or separate fields
      content: {
        text: String, // For headings/paragraphs
        level: Number, // For headings (h1, h2)
        code: String, // For code blocks
        language: String, // For syntax highlighting
        url: String, // For links
        linkTitle: String, // For link display text
      },
      order: Number, // Helpful for dragging/reordering
    },
  ],
  tags: [String],
  status: { type: String, default: "draft" },
};

const createBlock = (type, content = {}, order = 0) => ({
  id: crypto.randomUUID(),
  type,
  content,
  order,
});

const newPostFromForm = {
  title: "How to setup MongoDB",

  slug: "setup-mongodb-2026",

  description: "Beginner guide for setting up MongoDB in 2026",

  coverImage: "https://example.com/cover.png",

  author: {
    id: ObjectId("USER_ID"),
    name: "Omkar",
    username: "omkar",
    avatar: "https://example.com/avatar.png",
  },

  blocks: [
    // HEADING
    createBlock(
      "heading",
      {
        text: "MongoDB Installation Guide",
        level: 1, // h1 - h6
      },
      1,
    ),

    // PARAGRAPH
    createBlock(
      "paragraph",
      {
        text: "MongoDB is one of the most popular NoSQL databases.",
      },
      2,
    ),

    // CODE
    createBlock(
      "code",
      {
        language: "bash",
        code: "npm install mongodb",
        filename: "install.sh",
      },
      3,
    ),

    // IMAGE
    createBlock(
      "image",
      {
        url: "https://example.com/mongodb.png",
        alt: "MongoDB Image",
        caption: "MongoDB Dashboard",
        width: 1200,
        height: 700,
      },
      4,
    ),

    // VIDEO
    createBlock(
      "video",
      {
        url: "https://youtube.com/watch?v=example",
        provider: "youtube",
        title: "MongoDB Tutorial",
        thumbnail: "https://example.com/thumb.png",
      },
      5,
    ),

    // QUOTE
    createBlock(
      "quote",
      {
        text: "Data is a precious thing and will last longer than systems.",
        author: "Tim Berners-Lee",
      },
      6,
    ),

    // LIST
    createBlock(
      "list",
      {
        style: "unordered", // ordered | unordered
        items: ["Install MongoDB", "Create Database", "Connect Backend"],
      },
      7,
    ),

    // CHECKLIST
    createBlock(
      "checklist",
      {
        items: [
          {
            text: "Install Node.js",
            checked: true,
          },
          {
            text: "Install MongoDB",
            checked: false,
          },
        ],
      },
      8,
    ),

    // TABLE
    createBlock(
      "table",
      {
        headers: ["Feature", "Supported"],
        rows: [
          ["Authentication", "Yes"],
          ["Aggregation", "Yes"],
          ["Transactions", "Yes"],
        ],
      },
      9,
    ),

    // DIVIDER
    createBlock(
      "divider",
      {
        style: "solid", // solid | dashed | dotted
      },
      10,
    ),

    // LINK
    createBlock(
      "link",
      {
        url: "https://mongodb.com",
        title: "Official MongoDB Website",
        target: "_blank",
      },
      11,
    ),

    // EMBED
    createBlock(
      "embed",
      {
        url: "https://codesandbox.io/s/example",
        provider: "codesandbox",
        embedId: "example",
      },
      12,
    ),
  ],

  tags: ["mongodb", "backend", "database", "tutorial"],

  category: "Programming",

  status: "published", // draft | published | archived

  seo: {
    metaTitle: "How to setup MongoDB",
    metaDescription: "Complete MongoDB setup tutorial",
    keywords: ["mongodb", "database", "nosql"],
  },

  analytics: {
    views: 0,
    likes: 0,
    bookmarks: 0,
    shares: 0,
    readingTime: 5,
  },

  settings: {
    allowComments: true,
    isFeatured: false,
    visibility: "public", // public | private | unlisted
  },

  createdAt: new Date(),
  updatedAt: new Date(),

  publishedAt: new Date(),

  isDeleted: false,
};
