import { screensData } from '../screensData';

export function OverviewView() {
  return (
    <div 
      className="w-full"
      dangerouslySetInnerHTML={{ __html: screensData['overview'] || '' }} 
    />
  );
}
