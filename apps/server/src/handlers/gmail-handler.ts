// Gmail handler with lazy loading
// This module handles all Gmail API operations and only loads heavy dependencies when needed

import { getGmailClient, getGoogleAuth } from '../lib/lazy-modules';
import { env } from 'cloudflare:workers';

export class GmailHandler {
  private auth: unknown = null;
  private gmail: unknown = null;

  constructor(private config: {
    refreshToken: string;
    scope?: string;
  }) {}

  private async initializeAuth() {
    if (!this.auth) {
      const { OAuth2Client } = await getGoogleAuth();
      this.auth = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

      this.auth.setCredentials({
        refresh_token: this.config.refreshToken,
        scope: this.config.scope || this.getScope(),
      });

      const gmailModule = await getGmailClient();
      this.gmail = gmailModule({ version: 'v1', auth: this.auth });
    }
    return this.auth;
  }

  private getScope(): string {
    return [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
  }

  async getThread(threadId: string) {
    await this.initializeAuth();
    
    const response = await this.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    return response.data;
  }

  async listThreads(params: {
    q?: string;
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
  }) {
    await this.initializeAuth();

    const response = await this.gmail.users.threads.list({
      userId: 'me',
      ...params,
    });

    return response.data;
  }

  async getMessage(messageId: string) {
    await this.initializeAuth();

    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return response.data;
  }

  async sendMessage(message: Record<string, unknown>) {
    await this.initializeAuth();

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: message,
    });

    return response.data;
  }

  async createDraft(draft: Record<string, unknown>) {
    await this.initializeAuth();

    const response = await this.gmail.users.drafts.create({
      userId: 'me',
      requestBody: draft,
    });

    return response.data;
  }

  async listDrafts(params: {
    q?: string;
    maxResults?: number;
    pageToken?: string;
  }) {
    await this.initializeAuth();

    const response = await this.gmail.users.drafts.list({
      userId: 'me',
      ...params,
    });

    return response.data;
  }

  async getDraft(draftId: string) {
    await this.initializeAuth();

    const response = await this.gmail.users.drafts.get({
      userId: 'me',
      id: draftId,
    });

    return response.data;
  }

  async sendDraft(draftId: string) {
    await this.initializeAuth();

    const response = await this.gmail.users.drafts.send({
      userId: 'me',
      requestBody: { id: draftId },
    });

    return response.data;
  }

  async modifyLabels(messageIds: string[], addLabels: string[] = [], removeLabels: string[] = []) {
    await this.initializeAuth();

    const response = await this.gmail.users.messages.modify({
      userId: 'me',
      requestBody: {
        ids: messageIds,
        addLabelIds: addLabels,
        removeLabelIds: removeLabels,
      },
    });

    return response.data;
  }

  async getLabels() {
    await this.initializeAuth();

    const response = await this.gmail.users.labels.list({
      userId: 'me',
    });

    return response.data;
  }

  async createLabel(label: {
    name: string;
    color?: { backgroundColor: string; textColor: string };
  }) {
    await this.initializeAuth();

    const response = await this.gmail.users.labels.create({
      userId: 'me',
      requestBody: label,
    });

    return response.data;
  }

  async deleteLabel(labelId: string) {
    await this.initializeAuth();

    await this.gmail.users.labels.delete({
      userId: 'me',
      id: labelId,
    });
  }

  async getProfile() {
    await this.initializeAuth();

    const response = await this.gmail.users.getProfile({
      userId: 'me',
    });

    return response.data;
  }
}

// Factory function to create Gmail handler
export function createGmailHandler(refreshToken: string, scope?: string): GmailHandler {
  return new GmailHandler({ refreshToken, scope });
} 