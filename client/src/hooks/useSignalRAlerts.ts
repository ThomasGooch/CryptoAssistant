import { useEffect, useState, useCallback, useRef } from "react";
import { signalRAlertService } from "../services/signalRAlertService";
import type { SignalRAlertNotification } from "../types/domain";

/**
 * Custom hook for managing real-time alert notifications via SignalR
 */
export const useSignalRAlerts = (userId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [notifications, setNotifications] = useState<SignalRAlertNotification[]>([]);
  const previousUserIdRef = useRef<string>("");

  // Initialize connection once on mount
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      try {
        await signalRAlertService.startConnection();
        
        if (mounted) {
          setIsConnected(signalRAlertService.isConnected);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setIsConnected(false);
          setError(err instanceof Error ? err : new Error("Connection failed"));
          console.error("Failed to initialize SignalR alert connection:", err);
        }
      }
    };

    initializeConnection();

    return () => {
      mounted = false;
      signalRAlertService.stopConnection();
    };
  }, []);

  // Handle user subscription changes
  useEffect(() => {
    let mounted = true;

    const manageSubscription = async () => {
      const previousUserId = previousUserIdRef.current;
      
      // Only proceed if connected
      if (!signalRAlertService.isConnected) {
        return;
      }

      try {
        // Unsubscribe from previous user if needed
        if (previousUserId && previousUserId !== userId) {
          await signalRAlertService.unsubscribeFromAlerts(previousUserId);
        }

        // Subscribe to new user if valid
        if (userId?.trim() && userId !== previousUserId) {
          await signalRAlertService.subscribeToAlerts(userId);
          previousUserIdRef.current = userId;
        }

        if (mounted) {
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Subscription management failed"));
          console.error("Failed to manage alert subscription:", err);
        }
      }
    };

    // Update connection status and manage subscriptions
    setIsConnected(signalRAlertService.isConnected);
    manageSubscription();

    return () => {
      mounted = false;
    };
  }, [userId, isConnected]);

  // Register alert notification callback
  useEffect(() => {
    const handleAlertNotification = (notification: SignalRAlertNotification) => {
      setNotifications((prev) => [...prev, notification]);
    };

    signalRAlertService.onAlertNotification(handleAlertNotification);

    return () => {
      signalRAlertService.offAlertNotification(handleAlertNotification);
    };
  }, []);

  // Function to clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    error,
    notifications,
    clearNotifications,
  };
};