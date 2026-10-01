const requests = new Map<string, Promise<unknown>>();

export function shareInFlightRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  const pending = requests.get(key);
  if (pending !== undefined) return pending as Promise<T>;

  const request = load();
  requests.set(key, request);
  const clear = () => {
    if (requests.get(key) === request) requests.delete(key);
  };
  void request.then(clear, clear);
  return request;
}
