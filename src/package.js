module.exports = class Package {
  constructor(type, payload) {
    this.type = type;
    this.payload = payload;
  }

  /**
   * Write a package to binary data
   */
  write() {
    return JSON.stringify({
      type: this.type,
      payload: this.payload,
    });
  }

  /**
   * Create a package from binary data
   */
  static read(data) {
    const parsed = JSON.parse(data);

    return new Package(parsed.type, parsed.payload);
  }
};
