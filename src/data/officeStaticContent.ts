// Static (non-database) office content. Mission / Vision / Value and
// area intro copy live in code for now; database-backed content comes
// from the repository layer.

export const entranceStaticContent = {
  title: "AnyWare OFFICE",
  welcome: "Welcome to AnyWare",
  mission: "世の中をアップデートする。",
  vision: "“経済圏”にうねりを与え、育てる。",
  values: ["余白を、遊び場に。", "常識を、編集する。"],
} as const;

export const aiStaticContent = {
  title: "AI / DX LAB",
  status: "COMING SOON",
  topics: ["AI活用", "業務効率化", "Automation", "Knowledge"],
  description: "AI活用・業務効率化の取り組みを紹介するエリアです。",
} as const;

export const adminStaticContent = {
  notice: "ADMIN CONSOLE",
  availability: "AVAILABLE IN STEP 2.5",
  description:
    "管理コンソールは /admin に実装済みです。STEP 2.5でサーバーサイド認証により保護されます。",
} as const;
