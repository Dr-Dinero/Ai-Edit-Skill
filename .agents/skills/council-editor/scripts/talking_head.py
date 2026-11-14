#!/usr/bin/env python3
"""Council editor's talking-head renderer: the engine's renderer with the owner's house look.

usage: talking_head.py plan <spec.json> | render <plan.json> [--draft]

The renderer itself lives in talking-head-edit/scripts/talking_head.py and comes from the engine
(docs/ONE-ENGINE.md). Fix it there. This file only sets the default look; a spec's "look" and
a client preset still override it.
"""
import importlib.util, os, sys

HOUSE_LOOK = dict(font='Inter Black', accent='#FFC83D', caption_px=92, caption_y=1300,
                  title_y=205, chip_y=215, cta_y=190, slam_y=1190)

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, '..', '..', 'talking-head-edit', 'scripts', 'talking_head.py')
spec = importlib.util.spec_from_file_location('talking_head_engine', path)
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
engine.DEFAULT_LOOK = HOUSE_LOOK

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('plan', 'render'):
        print(__doc__); sys.exit(1)
    engine.main(sys.argv)
