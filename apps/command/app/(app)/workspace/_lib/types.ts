import type { CommitmentView, CommentView, MemberRef } from '../../data';

export interface OutcomeRef {
  id: string;
  title: string;
  state: string;
}

/** The serializable dataset the server hands to the client Workspace. */
export interface WorkspaceData {
  commitments: CommitmentView[];
  members: MemberRef[];
  outcomes: OutcomeRef[];
  comments: CommentView[];
  userId: string;
  exec: boolean;
  canManage: boolean;
  todayISO: string;
}

/** Props every view component receives. */
export interface ViewProps {
  commitments: CommitmentView[];
  members: MemberRef[];
  outcomes: OutcomeRef[];
  userId: string;
  exec: boolean;
  todayISO: string;
  onOpen: (id: string) => void;
}
