export interface Notification {
  id: number;
  message: string;
  date: Date;
  read: boolean;
  type?: 'info' | 'warning' | 'error' | 'success'; // Added type field for notification styling
}