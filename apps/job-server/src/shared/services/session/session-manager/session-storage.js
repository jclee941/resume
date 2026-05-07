export const sessionStorageMethods = {
  load(platform = null) {
    return this.getStore().load(platform);
  },

  save(platform, data) {
    return this.getStore().save(platform, data);
  },

  clear(platform = null) {
    return this.getStore().clear(platform);
  },
};
