import { tools } from './tools';

export const authTools = async (connectionId: string) => {
  return await tools(connectionId);
}; 