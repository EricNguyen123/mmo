'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useSessionValidation() {
  const [isValid, setIsValid] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch('/api/user/validate-session');
        const data = await response.json();

        if (!data.valid) {
          setIsValid(false);
          if (data.requiresReactivation) {
            // Show message and redirect after delay
            setTimeout(() => {
              router.push('/user/activate');
            }, 3000);
          } else {
            router.push('/user/activate');
          }
        } else {
          setIsValid(true);
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    // Validate on mount
    validateSession();

    // Validate every 2 minutes
    const interval = setInterval(validateSession, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [router]);

  return { isValid, loading };
}
