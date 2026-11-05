import { useEffect, useRef } from 'react';
import { donorAPI } from '../services/endpoints';

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // Don't re-sync more than once every 5 minutes
const STORAGE_KEY = 'lifelink_last_location_sync';

/**
 * Silently grabs the donor's current GPS position on app load
 * and sends it to the backend so emergency searches use fresh locations.
 *
 * Only runs for DONOR role users. Throttled to once every 5 minutes
 * to avoid hammering the Geolocation API or the backend.
 */
export function useLocationSync(user) {
  const syncing = useRef(false);

  useEffect(() => {
    // Only sync for logged-in donors
    if (!user || user.role !== 'DONOR') return;
    if (!navigator.geolocation) return;

    // Throttle: don't sync if we did it recently
    const lastSync = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) return;
    if (syncing.current) return;
    syncing.current = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          await donorAPI.updateLocation({ latitude, longitude, accuracy });
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
          console.log('[LocationSync] Location updated:', latitude.toFixed(4), longitude.toFixed(4));
        } catch (err) {
          // Silently fail — this is a background enhancement
          console.warn('[LocationSync] Failed to sync location:', err.message);
        } finally {
          syncing.current = false;
        }
      },
      (err) => {
        // User denied or geolocation unavailable — don't bother them
        console.warn('[LocationSync] Geolocation unavailable:', err.message);
        syncing.current = false;
      },
      {
        enableHighAccuracy: false, // Use network location — faster, less battery
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // Accept cached position up to 5 min old
      }
    );
  }, [user]);
}

