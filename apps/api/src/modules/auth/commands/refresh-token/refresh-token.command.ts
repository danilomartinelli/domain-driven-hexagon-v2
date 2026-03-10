import { Command, CommandProps } from '@repo/core';

export class RefreshTokenCommand extends Command {
  readonly refreshToken: string;

  constructor(props: CommandProps<RefreshTokenCommand>) {
    super(props);
    this.refreshToken = props.refreshToken;
  }
}
