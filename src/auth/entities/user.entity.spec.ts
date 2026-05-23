import { User } from './user.entity';

describe('User Entity', () => {
  it('should create an User Instance', () => {
    const user = new User();

    expect(user).toBeInstanceOf(User);
  });

  it('should clear email before save', () => {
    const user = new User();
    user.email = '  test@gmAil.com  ';

    user.checkFieldsBeforeInsert();
    expect(user.email).toBe('test@gmail.com');
  });

  it('should clear email before update', () => {
    const user = new User();
    user.email = '  TEst@gmail.com  ';

    user.checkFieldsBeforeUpdate();
    expect(user.email).toBe('test@gmail.com');
  });
});
