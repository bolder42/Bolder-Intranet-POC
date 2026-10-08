import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button, Card, CardBody, CardFooter, CardHeader, IconButton, Input, ThemeToggle } from './index';

describe('@bolder/ui primitives', () => {
  it('renders a primary button by default', () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toContain('btn');
    expect(html).toContain('btn-primary');
  });

  it('renders a secondary button when asked', () => {
    const html = renderToStaticMarkup(<Button variant="secondary">Cancel</Button>);
    expect(html).toContain('btn-secondary');
  });

  it('honours an explicit button type and disabled state', () => {
    const html = renderToStaticMarkup(
      <Button type="submit" disabled>
        Go
      </Button>,
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled');
  });

  it('renders an icon button with the correct class', () => {
    const html = renderToStaticMarkup(
      <IconButton aria-label="Search">
        <span>🔍</span>
      </IconButton>,
    );
    expect(html).toContain('icon-button');
    expect(html).toContain('aria-label="Search"');
  });

  it('renders an input label, error message and error styling', () => {
    const html = renderToStaticMarkup(<Input label="Email" name="email" error="Required" />);
    expect(html).toContain('Email');
    expect(html).toContain('input-error');
    expect(html).toContain('Required');
  });

  it('renders card subcomponents with their classes', () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(html).toContain('card');
    expect(html).toContain('card-header');
    expect(html).toContain('card-body');
    expect(html).toContain('card-footer');
  });

  it('renders the theme toggle with the requested icon', () => {
    const light = renderToStaticMarkup(<ThemeToggle theme="light" onToggle={() => {}} />);
    const dark = renderToStaticMarkup(<ThemeToggle theme="dark" onToggle={() => {}} />);

    // The light theme shows the moon icon (switch to dark), dark shows the sun.
    expect(light).toContain('M12 3a6');
    expect(dark).toContain('M12 2v2');
    expect(light).toContain('icon-button');
  });
});
