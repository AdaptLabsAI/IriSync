describe('Basic Tests', () => {
  it('should add numbers correctly', () => {
    expect(1 + 2).toBe(3);
  });

  it('should concatenate strings', () => {
    expect('hello ' + 'world').toBe('hello world');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr).toContain(2);
  });

  it('should work with objects', () => {
    const obj = { name: 'test', value: 123 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(123);
  });
}); 