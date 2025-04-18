import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'githubToCdn'
})
export class GithubToCdnPipe implements PipeTransform {

  transform(githubUrl: string): string {
    if (githubUrl && githubUrl.includes('github.com')) {
      return githubUrl
        .replace('github.com', 'cdn.jsdelivr.net/gh')
        .replace('/blob/', '/')
        .replace('%20', ' ');
    }
    return githubUrl;
  }

}
