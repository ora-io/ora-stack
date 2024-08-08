import { ethers } from 'ethers';

// Function to get the event signature
export function getEventSignature(abi: any[], eventName: string): string {
  // Create an Interface object from the ABI
  const iface = new ethers.Interface(abi);
  // Get the event fragment by name
  const eventFragment = iface.getEvent(eventName);

  if (!eventFragment) throw new Error(`event ${eventName} not found.`)

  // Return the event topic (which is the event signature)
  return eventFragment.topicHash
}

// Function to parse log to event parameters
export function parseLogToEventParams(abi: any[], eventName: string, log: any): any {
  // Create an Interface object from the ABI
  const iface = new ethers.Interface(abi);

  // Get the event fragment by name
  const eventFragment = iface.getEvent(eventName);

  // Parse the log
  const parsedLog = iface.decodeEventLog(eventFragment!, log.data, log.topics);

  return parsedLog;
}