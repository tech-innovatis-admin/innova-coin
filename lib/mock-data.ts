export type UserRole = "user" | "admin";
export type WithdrawStatus = "pending" | "released";
export type InstallmentEntry = {
  id: string;
  amount: number;
  addedAt: string;
};

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoUrl: string | null;
  pendingBalance: number;
  lastInstallment?: number;
  installments: InstallmentEntry[];
  availableAt: string;
  status: WithdrawStatus;
};

export type HeadAccount = {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  pendingBalance: number;
  lastInstallment?: number;
  installments: InstallmentEntry[];
  availableAt: string;
  status: WithdrawStatus;
};

export const mockUser: MockUser = {
  id: "usr_001",
  name: "User Mock",
  email: "samuel@email.com",
  role: "user",
  photoUrl: null,
  pendingBalance: 1840.55,
  lastInstallment: 320.75,
  installments: [
    {
      id: "inst_001",
      amount: 320.75,
      addedAt: "2026-03-20T10:15:00-03:00",
    },
    {
      id: "inst_002",
      amount: 300.4,
      addedAt: "2026-02-20T10:15:00-03:00",
    },
    {
      id: "inst_003",
      amount: 289.9,
      addedAt: "2026-01-20T10:15:00-03:00",
    },
    {
      id: "inst_004",
      amount: 275.5,
      addedAt: "2025-12-20T10:15:00-03:00",
    },
  ],
  availableAt: "2031-03-29T18:00:00-03:00",
  status: "pending",
};

export const mockAdmin: MockUser = {
  id: "adm_001",
  name: "Equipe Financeira",
  email: "admin@email.com",
  role: "admin",
  photoUrl: null,
  pendingBalance: mockUser.pendingBalance,
  installments: mockUser.installments,
  availableAt: mockUser.availableAt,
  status: mockUser.status,
};

export const mockHeads: HeadAccount[] = [
  {
    id: "head_001",
    userId: "usr_001",
    name: "User Mock",
    email: "samuel@email.com",
    photoUrl: "/homem_1025900-169.avif",
    pendingBalance: 1840.55,
    lastInstallment: 320.75,
    installments: mockUser.installments,
    availableAt: "2027-03-23T18:00:00-03:00",
    status: "pending",
  },
  {
    id: "head_002",
    userId: "usr_002",
    name: "Mariana Costa",
    email: "mariana@email.com",
    photoUrl: "/mulher777078-236.avif",
    pendingBalance: 980.0,
    lastInstallment: 180.0,
    installments: [
      {
        id: "inst_101",
        amount: 180.0,
        addedAt: "2026-03-18T14:00:00-03:00",
      },
      {
        id: "inst_102",
        amount: 175.0,
        addedAt: "2026-02-18T14:00:00-03:00",
      },
      {
        id: "inst_103",
        amount: 170.0,
        addedAt: "2026-01-18T14:00:00-03:00",
      },
    ],
    availableAt: "2031-03-27T14:30:00-03:00",
    status: "pending",
  },
  {
    id: "head_003",
    userId: "usr_003",
    name: "Lucas Pereira",
    email: "lucas@email.com",
    photoUrl: "/homem2.jpg",
    pendingBalance: 2450.9,
    lastInstallment: 450.9,
    installments: [
      {
        id: "inst_201",
        amount: 450.9,
        addedAt: "2026-03-10T09:00:00-03:00",
      },
      {
        id: "inst_202",
        amount: 430.0,
        addedAt: "2026-02-10T09:00:00-03:00",
      },
    ],
    availableAt: "2031-03-24T09:00:00-03:00",
    status: "released",
  },
  {
    id: "head_004",
    userId: "usr_004",
    name: "Joao",
    email: "joao@email.com",
    photoUrl: "/img_7502.avif",
    pendingBalance: 2450.9,
    lastInstallment: 250.0,
    installments: [
      {
        id: "inst_301",
        amount: 250.0,
        addedAt: "2026-03-08T08:30:00-03:00",
      },
      {
        id: "inst_302",
        amount: 250.0,
        addedAt: "2026-02-08T08:30:00-03:00",
      },
    ],
    availableAt: "2031-03-24T09:00:00-03:00",
    status: "released",
  },
];

export function getUserDashboardData(user: MockUser, heads: HeadAccount[]) {
  const matchedHead = heads.find((head) => head.userId === user.id);

  if (!matchedHead) {
    return user;
  }

  return {
    ...user,
    name: matchedHead.name,
    email: matchedHead.email,
    photoUrl: matchedHead.photoUrl,
    pendingBalance: matchedHead.pendingBalance,
    lastInstallment: matchedHead.lastInstallment,
    availableAt: matchedHead.availableAt,
    status: matchedHead.status,
  };
}
