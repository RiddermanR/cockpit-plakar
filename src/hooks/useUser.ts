import { useEffect, useState } from "react";

export const useUser = () => {
  const [userError, setError] = useState<string | null>(null);
  const [debugUser, setDebugUser] = useState<string>("");

  useEffect(() => {
    cockpit.spawn(["whoami"])
      .then((user) => setDebugUser(user.trim()))
      .catch((err) => setError(String(err)));
  }, []);
  return { debugUser, userError };
};
