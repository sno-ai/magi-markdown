declare module "js-yaml" {
  const yaml: {
    load(input: string): unknown;
    dump(input: unknown, options?: Record<string, unknown>): string;
  };
  export default yaml;
}
