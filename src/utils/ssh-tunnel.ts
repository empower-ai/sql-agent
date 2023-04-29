import { createTunnel } from 'tunnel-ssh';
import type * as ssh2 from 'ssh2';
import { userInfo } from 'os';
import getLogger from './logger.js';

const logger = getLogger('SSHTUnnel');

export async function createSSHTunnelIfNecessary(): Promise<void> {
  if (!process.env.SSH_TUNNEL_ENABLE) {
    return;
  }

  const remoteHostAddress = process.env.SSH_TUNNEL_REMOTE_HOST_ADDRESS;
  const remoteHostPort = process.env.SSH_TUNNEL_REMOTE_HOST_PORT;
  const username = process.env.SSH_TUNNEL_USERNAME;
  const password = process.env.SSH_TUNNEL_PASSWORD;
  const privateKey = process.env.SSH_TUNNEL_PRIVATE_KEY;
  const destinationIP = process.env.SSH_TUNNEL_DESTINATION_IP;
  const destinationPort = (Number(process.env.SSH_TUNNEL_DESTINATION_PORT) || null);
  const sourcePort = Number(process.env.SSH_TUNNEL_SOURCE_PORT ?? process.env.SSH_TUNNEL_DESTINATION_PORT);

  if (remoteHostAddress == null || destinationIP == null || destinationPort == null) {
    throw new Error('Missing necessary configs to start the ssh tunnel, make sure you provide SSH_TUNNEL_REMOTE_HOST, SSH_TUNNEL_DESTINATION_IP and SSH_TUNNEL_DESTINATION_PORT.');
  }
  if (password == null && privateKey == null) {
    throw new Error('Missing authentication mechanism, make sure you provide either SSH_TUNNEL_PASSWORD or SSH_TUNNEL_PRIVATE_KEY.');
  }

  const sshOptions: ssh2.ConnectConfig = {
    host: remoteHostAddress,
    port: (Number(remoteHostPort) || 22),
    username: username || userInfo().username
  };
  if (password) {
    sshOptions.password = password;
  }
  if (privateKey) {
    sshOptions.privateKey = privateKey;
  }

  const forwardOptions = {
    srcAddr: 'localhost',
    srcPort: sourcePort,
    dstAddr: destinationIP,
    dstPort: destinationPort
  }

  const serverOptions = {
    port: sourcePort
  }

  await createTunnel({}, serverOptions, sshOptions, forwardOptions);
  logger.info('Successfully established the ssh tunnel');
}
