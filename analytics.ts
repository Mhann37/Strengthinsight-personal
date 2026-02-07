export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (!gtag) return;
  gtag("event", eventName, params);
};

export const setUserProps = (props: Record<string, any>) => {
  if (typeof window === "undefined") return;
  const gtag = (window as any).gtag;
  if (!gtag) return;
  gtag("set", "user_properties", props);
};