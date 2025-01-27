import { Inject, Injectable } from '@nestjs/common';
import { createConnection, Socket } from 'net';
import { Observable } from 'rxjs';
import { DokkuOptionsRegister } from './common/interfaces';

@Injectable()
export class DokkuService {
  private socket: Socket;

  constructor(@Inject('DOKKU_OPTIONS') options: DokkuOptionsRegister) {
    this.socket = createConnection(options.socketPath);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private sendCommand(command: string, callback: Function) {
    try {
      this.socket.write(command + '\n');
    } catch (error) {
      callback(error.message, null, null);
      return;
    }

    this.socket.removeAllListeners('data').on('data', function (data) {
      const str = data
        .toString()
        // eslint-disable-next-line no-control-regex
        .replace(/\u001b.*?m/g, '')
        .trim();
      let obj = null;

      try {
        obj = JSON.parse(str);
      } catch (error) {
        callback(error.message, null, null);
        return;
      }

      const ok = obj.ok;
      const output = obj.output;

      callback(null, ok, output);
    });

    this.socket.removeAllListeners('error').on('error', function (error) {
      callback(error.message, null, null);
    });
  }

  runCommand(command: string) {
    return new Observable<string>((subscribe) => {
      this.sendCommand(
        command,
        (err: string | object, ok: boolean, output: string) => {
          if (err) {
            subscribe.error(err as string);
          }

          if (!ok) {
            subscribe.error(output as string);
          }

          subscribe.next(output);
          subscribe.complete();
        }
      );
    });
  }
}
