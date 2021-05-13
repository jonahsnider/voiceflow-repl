import {cli} from 'cli-ux';
import {State} from '@voiceflow/runtime';
import RuntimeClientFactory, {TraceType} from '@voiceflow/runtime-client-js';
import execa = require('execa');
import * as fs from 'fs/promises';
import * as path from 'path';

const config = {
	voiceflow: {
		versionID: '609d7eaf67afc4001cfe71f1',
		apiKey: 'VF.609d7354418a4c001b9d02b8.6YonIjnTvsIdIXypfa6NtCZpVr6UQWTMtJoELbHmXP'
	}
} as const;

let state: State | null = null;

async function main() {
	console.log('@@@@ voiceflow repl');

	const factory = new RuntimeClientFactory(config.voiceflow);
	let vf = factory.createClient(state ?? undefined);

	console.log('@@@@ start by sending a message');

	while (true) {
		const input = (await cli.prompt('<<<')) as string;

		const context = await vf.sendText(input);
		state = context.toJSON().state;

		for (const trace of context.getTrace()) {
			switch (trace.type) {
				case TraceType.SPEAK:
					console.log('>>>:', trace.payload.message);

					break;
				case TraceType.AUDIO:
					const mp3Contents = trace.payload.src;

					console.log('mp3');

					if (mp3Contents) {
						const fileName = path.join(__dirname, '..', 'tmp', 'audio.mp3');
						await fs.writeFile(fileName, mp3Contents, 'utf-8');

						// only works on mac
						await execa('open', [fileName]);
					} else {
						console.log('@@@@ not sure how to handle this audio trace');
					}

					break;
				case TraceType.END:
					// noop
					break;
				default:
					if (trace.defaultPath === undefined) {
						console.log('@@@@ not sure what kind of trace we got:', trace);
					} else {
						console.log('@@@@ custom trace? got', trace.type);
						console.log('@@@@ paths:');

						for (let i = 0; i < trace.paths!.length; i++) {
							const path = trace.paths![i];

							const bullet = '\t -';

							if (trace.defaultPath === i) {
								console.log(bullet, `${path.event.type} (default)`);
							} else {
								console.log(bullet, path.event.type);
							}
						}
					}

					break;
			}
		}

		if (context.isEnding()) {
			console.log('@@@@ conversation has ended');

			// TODO: reset state instead of exiting
			break;
		}
	}
}

main()
	.then(() => {
		console.log('@@@@ done, exiting');
	})
	.catch(error => {
		console.error('@@@@ fatal error:', error);
	});
