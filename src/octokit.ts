import { config } from 'dotenv-safe';
import { graphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';
import {
  appCredentialsFromString,
  AuthNarrowing,
  getAuthOptionsForOrg,
  getTokenForOrg,
} from '@electron/github-app-auth';
import { SHERIFF_GITHUB_APP_CREDS } from './constants.js';
import { IS_DRY_RUN } from './helpers.js';

config();

function getAuthNarrowing(forceReadOnly: boolean): AuthNarrowing {
  // In a dry run, ensure we only have read access to resources to avoid
  // any mishaps
  if (IS_DRY_RUN || forceReadOnly) {
    return {
      permissions: {
        administration: 'read',
        members: 'read',
        contents: 'read',
        metadata: 'read',
      },
    };
  }
  // Otherwise we should get a token with write access to admin/members
  return {
    permissions: {
      administration: 'write',
      members: 'write',
      contents: 'read',
      metadata: 'read',
    },
  };
}

// org <-> Octokit
let octokitMap: Map<string, Octokit> = new Map();
export async function getOctokit(org: string, forceReadOnly = false): Promise<Octokit> {
  if (!octokitMap.has(org)) {
    const creds = appCredentialsFromString(SHERIFF_GITHUB_APP_CREDS!);
    const authOpts = await getAuthOptionsForOrg(org, creds, getAuthNarrowing(forceReadOnly));
    octokitMap.set(org, new Octokit({ ...authOpts }));
  }

  return octokitMap.get(org)!;
}

export async function graphyOctokit(org: string, forceReadOnly = false) {
  const creds = appCredentialsFromString(SHERIFF_GITHUB_APP_CREDS!);
  const token = await getTokenForOrg(org, creds, getAuthNarrowing(forceReadOnly));
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
}
