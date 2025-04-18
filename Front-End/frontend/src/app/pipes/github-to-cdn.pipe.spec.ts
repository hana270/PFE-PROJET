import { GithubToCdnPipe } from './github-to-cdn.pipe';

describe('GithubToCdnPipe', () => {
  it('create an instance', () => {
    const pipe = new GithubToCdnPipe();
    expect(pipe).toBeTruthy();
  });
});
