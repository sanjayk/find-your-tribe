import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from './avatar';

describe('Avatar', () => {
  it('renders without crashing', () => {
    render(<Avatar />);
  });

  it('renders children content', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument();
  });

  it('applies default size', () => {
    const { container } = render(<Avatar />);
    const el = container.querySelector('[data-slot="avatar"]');
    expect(el).toHaveAttribute('data-size', 'default');
  });

  it('applies sm size', () => {
    const { container } = render(<Avatar size="sm" />);
    const el = container.querySelector('[data-slot="avatar"]');
    expect(el).toHaveAttribute('data-size', 'sm');
  });

  it('applies lg size', () => {
    const { container } = render(<Avatar size="lg" />);
    const el = container.querySelector('[data-slot="avatar"]');
    expect(el).toHaveAttribute('data-size', 'lg');
  });

  it('forwards custom className', () => {
    const { container } = render(<Avatar className="custom-class" />);
    const el = container.querySelector('[data-slot="avatar"]');
    expect(el).toHaveClass('custom-class');
  });
});

describe('AvatarImage', () => {
  // Note: Radix Avatar uses an internal image load check. In jsdom, the image
  // load event never fires, so AvatarImage is not rendered into the DOM at all.
  // The fallback is shown instead. We test that AvatarImage doesn't crash, and
  // that the fallback mechanism works correctly in this scenario.

  it('renders without crashing inside Avatar', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
      </Avatar>,
    );
  });

  it('shows fallback when image has not loaded (jsdom behavior)', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    // In jsdom, image never loads so fallback is displayed
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders alongside fallback without errors', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" className="img-class" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    // The avatar root should still be present
    expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument();
  });
});

describe('AvatarFallback', () => {
  it('renders without crashing', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
  });

  it('renders fallback text', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(container.querySelector('[data-slot="avatar-fallback"]')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback className="fallback-class">AB</AvatarFallback>
      </Avatar>,
    );
    const el = container.querySelector('[data-slot="avatar-fallback"]');
    expect(el).toHaveClass('fallback-class');
  });
});

describe('AvatarBadge', () => {
  it('renders without crashing', () => {
    render(
      <Avatar>
        <AvatarBadge />
      </Avatar>,
    );
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarBadge />
      </Avatar>,
    );
    expect(container.querySelector('[data-slot="avatar-badge"]')).toBeInTheDocument();
  });

  it('renders children inside badge', () => {
    render(
      <Avatar>
        <AvatarBadge>
          <span>!</span>
        </AvatarBadge>
      </Avatar>,
    );
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(
      <Avatar>
        <AvatarBadge className="badge-class" />
      </Avatar>,
    );
    const el = container.querySelector('[data-slot="avatar-badge"]');
    expect(el).toHaveClass('badge-class');
  });
});

describe('AvatarGroup', () => {
  it('renders without crashing', () => {
    render(<AvatarGroup />);
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<AvatarGroup />);
    expect(container.querySelector('[data-slot="avatar-group"]')).toBeInTheDocument();
  });

  it('renders multiple avatars', () => {
    render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </AvatarGroup>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<AvatarGroup className="group-class" />);
    const el = container.querySelector('[data-slot="avatar-group"]');
    expect(el).toHaveClass('group-class');
  });
});

describe('AvatarGroupCount', () => {
  it('renders without crashing', () => {
    render(<AvatarGroupCount>+3</AvatarGroupCount>);
  });

  it('has the correct data-slot attribute', () => {
    const { container } = render(<AvatarGroupCount>+3</AvatarGroupCount>);
    expect(container.querySelector('[data-slot="avatar-group-count"]')).toBeInTheDocument();
  });

  it('renders count text', () => {
    render(<AvatarGroupCount>+5</AvatarGroupCount>);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('forwards custom className', () => {
    const { container } = render(<AvatarGroupCount className="count-class">+3</AvatarGroupCount>);
    const el = container.querySelector('[data-slot="avatar-group-count"]');
    expect(el).toHaveClass('count-class');
  });
});
