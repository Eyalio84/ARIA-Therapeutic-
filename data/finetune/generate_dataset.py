#!/usr/bin/env python3
"""
FunctionGemma Fine-Tuning Dataset Generator

Generates a complete training dataset for FunctionGemma 270M from SU Lab functions.
Outputs FunctionGemma-format JSONL ready for HuggingFace AutoTrain.

Pipeline:
1. Define all 45 functions with diverse utterance templates
2. Generate 10+ examples per function
3. Create subset variants (5/15/all functions per example)
4. Add negative examples (no-function-call)
5. Merge with existing AI-LAB dataset (if available)
6. Deduplicate, shuffle, export
"""

import json
import random
import os
import hashlib
from typing import List, Dict, Any, Optional

# ── All 45 SU Lab Functions ──────────────────────────────────────

FUNCTIONS = {
    # Object manipulation
    "set_size": {
        "description": "Set size",
        "parameters": {"size": "number"},
        "utterances": [
            ("make it bigger", {"size": 150}),
            ("increase the size", {"size": 130}),
            ("scale up to 200", {"size": 200}),
            ("make it smaller", {"size": 40}),
            ("size 80 please", {"size": 80}),
            ("I want it tiny", {"size": 20}),
            ("enlarge it", {"size": 180}),
            ("shrink it down", {"size": 30}),
            ("set size to 100", {"size": 100}),
            ("make it huge", {"size": 250}),
            ("can you resize it to 60", {"size": 60}),
            ("double the size", {"size": 200}),
        ],
    },
    "set_color": {
        "description": "Set color",
        "parameters": {"color": "string"},
        "utterances": [
            ("make it red", {"color": "red"}),
            ("turn it blue", {"color": "blue"}),
            ("change color to green", {"color": "green"}),
            ("I want it yellow", {"color": "yellow"}),
            ("set color purple", {"color": "purple"}),
            ("make it orange", {"color": "orange"}),
            ("change to pink", {"color": "pink"}),
            ("color it cyan", {"color": "cyan"}),
            ("make it white", {"color": "white"}),
            ("set the hue to 200", {"color": "200"}),
            ("turn this one red please", {"color": "red"}),
            ("can you make it a nice blue", {"color": "blue"}),
        ],
    },
    "set_opacity": {
        "description": "Set opacity 0-1",
        "parameters": {"opacity": "number"},
        "utterances": [
            ("make it transparent", {"opacity": 0.3}),
            ("set opacity to 50 percent", {"opacity": 0.5}),
            ("make it fully visible", {"opacity": 1}),
            ("fade it out", {"opacity": 0.2}),
            ("half transparent", {"opacity": 0.5}),
            ("set opacity 0.7", {"opacity": 0.7}),
            ("make it almost invisible", {"opacity": 0.1}),
            ("full opacity please", {"opacity": 1}),
            ("transparency to 80 percent", {"opacity": 0.8}),
            ("I want to see through it a little", {"opacity": 0.6}),
        ],
    },
    "move_object": {
        "description": "Move direction",
        "parameters": {"direction": "string", "pixels": "number"},
        "utterances": [
            ("move it left", {"direction": "left", "pixels": 30}),
            ("go right 50 pixels", {"direction": "right", "pixels": 50}),
            ("move up", {"direction": "up", "pixels": 30}),
            ("move down 100", {"direction": "down", "pixels": 100}),
            ("shift it to the left", {"direction": "left", "pixels": 30}),
            ("push it right", {"direction": "right", "pixels": 30}),
            ("move it up a bit", {"direction": "up", "pixels": 20}),
            ("go down 40 pixels", {"direction": "down", "pixels": 40}),
            ("nudge it left 10", {"direction": "left", "pixels": 10}),
            ("slide right 80", {"direction": "right", "pixels": 80}),
        ],
    },
    "set_position": {
        "description": "Set x,y",
        "parameters": {"x": "number", "y": "number"},
        "utterances": [
            ("put it at 100, 200", {"x": 100, "y": 200}),
            ("position at 50 50", {"x": 50, "y": 50}),
            ("move to coordinates 300 400", {"x": 300, "y": 400}),
            ("set position to 0 0", {"x": 0, "y": 0}),
            ("place it at 150 300", {"x": 150, "y": 300}),
            ("put it in the center at 200 350", {"x": 200, "y": 350}),
            ("position 250 100", {"x": 250, "y": 100}),
            ("move to x 80 y 120", {"x": 80, "y": 120}),
            ("set x to 400 y to 200", {"x": 400, "y": 200}),
            ("place at top left 10 10", {"x": 10, "y": 10}),
        ],
    },
    "transform_shape": {
        "description": "Set shape",
        "parameters": {"shape": "string"},
        "utterances": [
            ("make it a circle", {"shape": "circle"}),
            ("change to square", {"shape": "square"}),
            ("transform into triangle", {"shape": "triangle"}),
            ("turn it into a circle", {"shape": "circle"}),
            ("I want a square", {"shape": "square"}),
            ("make it triangular", {"shape": "triangle"}),
            ("change shape to circle", {"shape": "circle"}),
            ("switch to square shape", {"shape": "square"}),
            ("convert to triangle", {"shape": "triangle"}),
            ("shape circle please", {"shape": "circle"}),
        ],
    },
    "set_width": {
        "description": "Set width",
        "parameters": {"width": "number"},
        "utterances": [
            ("set width to 200", {"width": 200}),
            ("make it wider", {"width": 150}),
            ("width 300", {"width": 300}),
            ("stretch it horizontally to 250", {"width": 250}),
            ("narrow it down to 50", {"width": 50}),
            ("set the width to 100", {"width": 100}),
            ("make it 180 wide", {"width": 180}),
            ("widen it", {"width": 160}),
            ("horizontal size 120", {"width": 120}),
            ("I want it 400 pixels wide", {"width": 400}),
        ],
    },
    "set_height": {
        "description": "Set height",
        "parameters": {"height": "number"},
        "utterances": [
            ("set height to 200", {"height": 200}),
            ("make it taller", {"height": 150}),
            ("height 300", {"height": 300}),
            ("stretch it vertically", {"height": 200}),
            ("shorter please 50", {"height": 50}),
            ("make it 180 tall", {"height": 180}),
            ("vertical size 120", {"height": 120}),
            ("I want it taller at 250", {"height": 250}),
            ("set the height to 100", {"height": 100}),
            ("make it a thin strip height 20", {"height": 20}),
        ],
    },
    "select_object": {
        "description": "Select by label",
        "parameters": {"label": "string"},
        "utterances": [
            ("select A", {"label": "A"}),
            ("switch to B", {"label": "B"}),
            ("pick object C", {"label": "C"}),
            ("go to D", {"label": "D"}),
            ("select the one called header", {"label": "header"}),
            ("I want to work on B", {"label": "B"}),
            ("choose A please", {"label": "A"}),
            ("focus on E", {"label": "E"}),
            ("switch to object F", {"label": "F"}),
            ("select object A", {"label": "A"}),
        ],
    },
    "rename_object": {
        "description": "Rename",
        "parameters": {"name": "string"},
        "utterances": [
            ("rename it to header", {"name": "header"}),
            ("call it logo", {"name": "logo"}),
            ("name it button1", {"name": "button1"}),
            ("rename to sidebar", {"name": "sidebar"}),
            ("change name to nav", {"name": "nav"}),
            ("call this one footer", {"name": "footer"}),
            ("set name to card", {"name": "card"}),
            ("rename it player", {"name": "player"}),
            ("I want to call it hero", {"name": "hero"}),
            ("name this background", {"name": "background"}),
        ],
    },
    # CRUD
    "add_object": {
        "description": "Create object",
        "parameters": {"shape": "string", "color": "string"},
        "utterances": [
            ("add a new circle", {"shape": "circle"}),
            ("create a square", {"shape": "square"}),
            ("add a red triangle", {"shape": "triangle", "color": "red"}),
            ("new object please", {}),
            ("create a blue circle", {"shape": "circle", "color": "blue"}),
            ("add another one", {}),
            ("make a new green square", {"shape": "square", "color": "green"}),
            ("create object", {}),
            ("add a shape", {}),
            ("I need another circle", {"shape": "circle"}),
        ],
    },
    "duplicate_object": {
        "description": "Duplicate",
        "parameters": {},
        "utterances": [
            ("duplicate it", {}),
            ("clone this", {}),
            ("make a copy", {}),
            ("copy it", {}),
            ("duplicate the selected one", {}),
            ("clone this object", {}),
            ("I want a copy of this", {}),
            ("make another one like this", {}),
            ("replicate it", {}),
            ("create a duplicate", {}),
        ],
    },
    "delete_object": {
        "description": "Delete",
        "parameters": {},
        "utterances": [
            ("delete it", {}),
            ("remove this", {}),
            ("get rid of it", {}),
            ("delete the selected one", {}),
            ("remove this object", {}),
            ("trash it", {}),
            ("I don't need this anymore", {}),
            ("take it away", {}),
            ("erase it", {}),
            ("kill it", {}),
        ],
    },
    "list_objects": {
        "description": "List all",
        "parameters": {},
        "utterances": [
            ("list all objects", {}),
            ("what's on the canvas", {}),
            ("show me everything", {}),
            ("how many objects", {}),
            ("list them", {}),
            ("what do we have", {}),
            ("show all", {}),
            ("enumerate objects", {}),
            ("count the objects", {}),
            ("tell me what's there", {}),
        ],
    },
    "get_state": {
        "description": "Show states",
        "parameters": {},
        "utterances": [
            ("show state", {}),
            ("what's the current state", {}),
            ("give me the info", {}),
            ("status", {}),
            ("show properties", {}),
            ("what are the values", {}),
            ("tell me the state of everything", {}),
            ("object info", {}),
            ("current state please", {}),
            ("show me the details", {}),
        ],
    },
    "reset_objects": {
        "description": "Reset all",
        "parameters": {},
        "utterances": [
            ("reset everything", {}),
            ("start over", {}),
            ("reset all", {}),
            ("clear and reset", {}),
            ("go back to default", {}),
            ("undo everything", {}),
            ("restart", {}),
            ("reset the canvas", {}),
            ("back to beginning", {}),
            ("reset please", {}),
        ],
    },
    # Config
    "open_config": {
        "description": "Open config",
        "parameters": {},
        "utterances": [
            ("open config", {}),
            ("show configuration", {}),
            ("open settings", {}),
            ("configure this", {}),
            ("open the panel", {}),
            ("show config panel", {}),
            ("settings please", {}),
            ("I want to configure it", {}),
            ("open configuration", {}),
            ("edit settings", {}),
        ],
    },
    "close_config": {
        "description": "Close config",
        "parameters": {},
        "utterances": [
            ("close config", {}),
            ("close the panel", {}),
            ("done configuring", {}),
            ("close settings", {}),
            ("hide config", {}),
            ("close it", {}),
            ("I'm done", {}),
            ("close configuration", {}),
            ("exit settings", {}),
            ("dismiss", {}),
        ],
    },
    "edit_shape": {
        "description": "Resize handles on",
        "parameters": {},
        "utterances": [
            ("edit shape", {}),
            ("resize mode", {}),
            ("show handles", {}),
            ("I want to resize it", {}),
            ("enter edit mode", {}),
            ("show resize handles", {}),
            ("let me stretch it", {}),
            ("enable resizing", {}),
            ("turn on handles", {}),
            ("shape edit mode", {}),
        ],
    },
    "done_editing": {
        "description": "Resize handles off",
        "parameters": {},
        "utterances": [
            ("done editing", {}),
            ("exit edit mode", {}),
            ("hide handles", {}),
            ("stop resizing", {}),
            ("finish editing", {}),
            ("close edit mode", {}),
            ("I'm done editing", {}),
            ("turn off handles", {}),
            ("exit resize mode", {}),
            ("done", {}),
        ],
    },
    # Canvas
    "zoom_canvas": {
        "description": "Zoom 0.5-2",
        "parameters": {"level": "number"},
        "utterances": [
            ("zoom in", {"level": 1.3}),
            ("zoom out", {"level": 0.7}),
            ("zoom to 150 percent", {"level": 1.5}),
            ("set zoom to 1", {"level": 1}),
            ("zoom in more", {"level": 1.5}),
            ("zoom out a bit", {"level": 0.8}),
            ("reset zoom", {"level": 1}),
            ("zoom to 200", {"level": 2}),
            ("zoom level 1.2", {"level": 1.2}),
            ("make everything bigger zoom in", {"level": 1.4}),
        ],
    },
    "set_background": {
        "description": "Background color",
        "parameters": {"color": "string"},
        "utterances": [
            ("set background to dark blue", {"color": "dark blue"}),
            ("make the background black", {"color": "black"}),
            ("background white", {"color": "white"}),
            ("change background to red", {"color": "red"}),
            ("dark background please", {"color": "dark"}),
            ("set background color green", {"color": "green"}),
            ("make it a light background", {"color": "#e0e0e0"}),
            ("background gray", {"color": "gray"}),
            ("I want a purple background", {"color": "purple"}),
            ("set canvas color to orange", {"color": "orange"}),
        ],
    },
    "toggle_grid": {
        "description": "Grid on/off",
        "parameters": {"visible": "boolean"},
        "utterances": [
            ("show grid", {"visible": True}),
            ("hide grid", {"visible": False}),
            ("turn on the grid", {"visible": True}),
            ("turn off grid", {"visible": False}),
            ("grid on", {"visible": True}),
            ("grid off", {"visible": False}),
            ("I want to see the grid", {"visible": True}),
            ("remove the grid lines", {"visible": False}),
            ("display grid", {"visible": True}),
            ("no grid", {"visible": False}),
        ],
    },
    "clear_canvas": {
        "description": "Clear all",
        "parameters": {},
        "utterances": [
            ("clear everything", {}),
            ("clear the canvas", {}),
            ("remove all objects", {}),
            ("wipe it clean", {}),
            ("start fresh", {}),
            ("clear all", {}),
            ("empty the canvas", {}),
            ("delete everything", {}),
            ("clean slate", {}),
            ("nuke it all", {}),
        ],
    },
    "snap_to_grid": {
        "description": "Snap on/off",
        "parameters": {"enabled": "boolean"},
        "utterances": [
            ("enable snapping", {"enabled": True}),
            ("turn on snap to grid", {"enabled": True}),
            ("disable snapping", {"enabled": False}),
            ("snap off", {"enabled": False}),
            ("I want objects to snap", {"enabled": True}),
            ("turn off snap", {"enabled": False}),
            ("enable grid snapping", {"enabled": True}),
            ("no snapping", {"enabled": False}),
            ("snap on", {"enabled": True}),
            ("free movement no snap", {"enabled": False}),
        ],
    },
    # Presets
    "save_preset": {
        "description": "Save layout",
        "parameters": {"name": "string"},
        "utterances": [
            ("save this as my header", {"name": "my header"}),
            ("save preset called landing", {"name": "landing"}),
            ("save layout as homepage", {"name": "homepage"}),
            ("remember this as design1", {"name": "design1"}),
            ("save this arrangement", {"name": "arrangement"}),
            ("store this as test layout", {"name": "test layout"}),
            ("save as game background", {"name": "game background"}),
            ("preset save cool design", {"name": "cool design"}),
            ("save current state as draft", {"name": "draft"}),
            ("bookmark this layout as final", {"name": "final"}),
        ],
    },
    "load_preset": {
        "description": "Load layout",
        "parameters": {"name": "string"},
        "utterances": [
            ("load my header", {"name": "my header"}),
            ("open preset landing", {"name": "landing"}),
            ("load the homepage layout", {"name": "homepage"}),
            ("restore design1", {"name": "design1"}),
            ("bring back the arrangement", {"name": "arrangement"}),
            ("load test layout", {"name": "test layout"}),
            ("get the game background", {"name": "game background"}),
            ("open cool design", {"name": "cool design"}),
            ("load draft", {"name": "draft"}),
            ("restore final", {"name": "final"}),
        ],
    },
    # Relations
    "align_objects": {
        "description": "Align all",
        "parameters": {"axis": "string"},
        "utterances": [
            ("align left", {"axis": "left"}),
            ("align everything to the right", {"axis": "right"}),
            ("align top", {"axis": "top"}),
            ("align to bottom", {"axis": "bottom"}),
            ("center them horizontally", {"axis": "center-h"}),
            ("center vertically", {"axis": "center-v"}),
            ("line them up on the left", {"axis": "left"}),
            ("push everything to the right", {"axis": "right"}),
            ("align all to the top", {"axis": "top"}),
            ("center everything", {"axis": "center-h"}),
        ],
    },
    "set_layer": {
        "description": "Layer order",
        "parameters": {"position": "string"},
        "utterances": [
            ("bring to front", {"position": "front"}),
            ("send to back", {"position": "back"}),
            ("move forward", {"position": "forward"}),
            ("move backward", {"position": "backward"}),
            ("bring it to the front", {"position": "front"}),
            ("send it to the back", {"position": "back"}),
            ("put it on top", {"position": "front"}),
            ("put it behind everything", {"position": "back"}),
            ("one layer forward", {"position": "forward"}),
            ("one layer back", {"position": "backward"}),
        ],
    },
    "group_objects": {
        "description": "Group by labels",
        "parameters": {"labels": "string"},
        "utterances": [
            ("group A and B", {"labels": "A,B"}),
            ("group B C D together", {"labels": "B,C,D"}),
            ("put A and C in a group", {"labels": "A,C"}),
            ("group these A B C", {"labels": "A,B,C"}),
            ("link A and B together", {"labels": "A,B"}),
            ("combine D and E", {"labels": "D,E"}),
            ("group all of them A B C D", {"labels": "A,B,C,D"}),
            ("make A and B move together", {"labels": "A,B"}),
            ("group header and nav", {"labels": "header,nav"}),
            ("tie A B and C", {"labels": "A,B,C"}),
        ],
    },
    "ungroup_objects": {
        "description": "Ungroup",
        "parameters": {},
        "utterances": [
            ("ungroup", {}),
            ("ungroup this", {}),
            ("break the group", {}),
            ("separate them", {}),
            ("unlink", {}),
            ("remove from group", {}),
            ("free this object", {}),
            ("detach from group", {}),
            ("ungroup the selected one", {}),
            ("split the group", {}),
        ],
    },
    "distribute_evenly": {
        "description": "Space evenly",
        "parameters": {"axis": "string"},
        "utterances": [
            ("space them out horizontally", {"axis": "horizontal"}),
            ("distribute vertically", {"axis": "vertical"}),
            ("even spacing horizontal", {"axis": "horizontal"}),
            ("spread them out vertically", {"axis": "vertical"}),
            ("distribute evenly", {"axis": "horizontal"}),
            ("equal spacing", {"axis": "horizontal"}),
            ("space them vertically", {"axis": "vertical"}),
            ("even out the gaps horizontally", {"axis": "horizontal"}),
            ("distribute objects evenly vertical", {"axis": "vertical"}),
            ("make equal distance between them", {"axis": "horizontal"}),
        ],
    },
    "export_layout": {
        "description": "Export json/css/html",
        "parameters": {"format": "string"},
        "utterances": [
            ("export as CSS", {"format": "css"}),
            ("export HTML", {"format": "html"}),
            ("export as JSON", {"format": "json"}),
            ("generate the CSS code", {"format": "css"}),
            ("give me the HTML", {"format": "html"}),
            ("export layout as CSS", {"format": "css"}),
            ("convert to HTML code", {"format": "html"}),
            ("get the JSON data", {"format": "json"}),
            ("export this as code", {"format": "css"}),
            ("generate HTML for this", {"format": "html"}),
        ],
    },
    # Animation
    "animate": {
        "description": "Animate spin/bounce/pulse",
        "parameters": {"type": "string", "speed": "number"},
        "utterances": [
            ("make it spin", {"type": "spin", "speed": 2}),
            ("start bouncing", {"type": "bounce", "speed": 2}),
            ("pulse it", {"type": "pulse", "speed": 2}),
            ("spin slowly", {"type": "spin", "speed": 4}),
            ("bounce fast", {"type": "bounce", "speed": 1}),
            ("make it pulse slowly", {"type": "pulse", "speed": 3}),
            ("start spinning", {"type": "spin", "speed": 2}),
            ("add a bounce animation", {"type": "bounce", "speed": 2}),
            ("I want it to spin fast", {"type": "spin", "speed": 1}),
            ("animate with pulse", {"type": "pulse", "speed": 2}),
        ],
    },
    "stop_animation": {
        "description": "Stop animation",
        "parameters": {},
        "utterances": [
            ("stop", {}),
            ("stop the animation", {}),
            ("freeze it", {}),
            ("stop moving", {}),
            ("stop spinning", {}),
            ("no more animation", {}),
            ("halt", {}),
            ("stop bouncing", {}),
            ("freeze", {}),
            ("kill the animation", {}),
        ],
    },
    "orbit": {
        "description": "Orbit around label",
        "parameters": {"target": "string", "speed": "number"},
        "utterances": [
            ("orbit around A", {"target": "A", "speed": 3}),
            ("circle around B", {"target": "B", "speed": 3}),
            ("orbit B slowly", {"target": "B", "speed": 5}),
            ("make it orbit around C", {"target": "C", "speed": 3}),
            ("revolve around A fast", {"target": "A", "speed": 1.5}),
            ("go around D", {"target": "D", "speed": 3}),
            ("orbit around the header", {"target": "header", "speed": 3}),
            ("circle A", {"target": "A", "speed": 3}),
            ("start orbiting B", {"target": "B", "speed": 3}),
            ("orbit around object A slowly", {"target": "A", "speed": 4}),
        ],
    },
    # Device
    "toggle_torch": {
        "description": "Flashlight",
        "parameters": {"on": "boolean"},
        "utterances": [
            ("flashlight on", {"on": True}),
            ("turn on the flashlight", {"on": True}),
            ("flashlight off", {"on": False}),
            ("turn off the light", {"on": False}),
            ("torch on", {"on": True}),
            ("torch off", {"on": False}),
            ("light on", {"on": True}),
            ("kill the flashlight", {"on": False}),
            ("I need light", {"on": True}),
            ("turn the torch on please", {"on": True}),
        ],
    },
    "check_battery": {
        "description": "Battery",
        "parameters": {},
        "utterances": [
            ("check battery", {}),
            ("battery status", {}),
            ("how much battery", {}),
            ("what's the battery level", {}),
            ("battery percentage", {}),
            ("am I charging", {}),
            ("how's the battery", {}),
            ("battery check", {}),
            ("power status", {}),
            ("what percent battery", {}),
        ],
    },
    "send_notification": {
        "description": "Notify",
        "parameters": {"title": "string", "text": "string"},
        "utterances": [
            ("send notification hello", {"title": "Hello", "text": "Hello from Aria"}),
            ("notify me task done", {"title": "Task", "text": "done"}),
            ("send a notification saying hi", {"title": "Hi", "text": "Hi there"}),
            ("notification reminder to check email", {"title": "Reminder", "text": "Check email"}),
            ("alert me with a notification", {"title": "Alert", "text": "Aria alert"}),
            ("push notification break time", {"title": "Break", "text": "Time for a break"}),
            ("notify meeting in 5", {"title": "Meeting", "text": "In 5 minutes"}),
            ("send notification test", {"title": "Test", "text": "Testing notifications"}),
            ("notification lunch time", {"title": "Lunch", "text": "Time for lunch"}),
            ("remind me to call", {"title": "Reminder", "text": "Call someone"}),
        ],
    },
    "set_volume": {
        "description": "Volume",
        "parameters": {"level": "number"},
        "utterances": [
            ("volume to 5", {"level": 5}),
            ("set volume 10", {"level": 10}),
            ("turn it up to 8", {"level": 8}),
            ("volume down to 3", {"level": 3}),
            ("mute the volume", {"level": 0}),
            ("max volume", {"level": 15}),
            ("volume 7 please", {"level": 7}),
            ("set volume to zero", {"level": 0}),
            ("turn up the volume", {"level": 10}),
            ("lower the volume to 2", {"level": 2}),
        ],
    },
    "clipboard_copy": {
        "description": "Copy clipboard",
        "parameters": {"text": "string"},
        "utterances": [
            ("copy to clipboard", {}),
            ("copy the state", {}),
            ("copy this text hello world", {"text": "hello world"}),
            ("clipboard copy", {}),
            ("put it on the clipboard", {}),
            ("copy everything", {}),
            ("copy current state to clipboard", {}),
            ("clipboard please", {}),
            ("copy canvas state", {}),
            ("save to clipboard", {}),
        ],
    },
    # Typed objects
    "add_image": {
        "description": "Add image container",
        "parameters": {},
        "utterances": [
            ("add an image", {}),
            ("create an image container", {}),
            ("I want to add a picture", {}),
            ("new image object", {}),
            ("add image placeholder", {}),
            ("create a photo frame", {}),
            ("add a picture container", {}),
            ("I need an image slot", {}),
            ("put an image on the canvas", {}),
            ("add image element", {}),
        ],
    },
    "add_button": {
        "description": "Add interactive button",
        "parameters": {"button_label": "string", "target": "string", "action": "string"},
        "utterances": [
            ("add a button", {"button_label": "Tap"}),
            ("create a button called start", {"button_label": "Start"}),
            ("add a button that toggles A", {"button_label": "Toggle", "target": "A", "action": "toggle_visibility"}),
            ("new button submit", {"button_label": "Submit"}),
            ("add a click button", {"button_label": "Click"}),
            ("create toggle button for B", {"button_label": "Toggle", "target": "B", "action": "toggle_visibility"}),
            ("I want a button", {"button_label": "Tap"}),
            ("add button labeled go", {"button_label": "Go"}),
            ("create a link button", {"button_label": "Link"}),
            ("add interactive button reset", {"button_label": "Reset"}),
        ],
    },
    "set_image": {
        "description": "Set image source on selected",
        "parameters": {"source": "string"},
        "utterances": [
            ("set image to logo.png", {"source": "logo.png"}),
            ("load image from photo.jpg", {"source": "photo.jpg"}),
            ("set the image source", {"source": "image.png"}),
            ("use this image avatar.png", {"source": "avatar.png"}),
            ("load the picture background.jpg", {"source": "background.jpg"}),
            ("set source to icon.svg", {"source": "icon.svg"}),
            ("image url https example.com pic.jpg", {"source": "https://example.com/pic.jpg"}),
            ("use banner.png as the image", {"source": "banner.png"}),
            ("set picture to selfie.jpg", {"source": "selfie.jpg"}),
            ("load hero-image.png", {"source": "hero-image.png"}),
        ],
    },
    "take_photo": {
        "description": "Take camera photo for selected image",
        "parameters": {},
        "utterances": [
            ("take a photo", {}),
            ("use the camera", {}),
            ("capture a photo", {}),
            ("take a picture", {}),
            ("camera shot", {}),
            ("snap a photo", {}),
            ("photograph this", {}),
            ("take a selfie for this", {}),
            ("use camera to fill this image", {}),
            ("capture with camera", {}),
        ],
    },
}

# ── Negative Examples (no function call) ─────────────────────────

NEGATIVE_UTTERANCES = [
    "how are you",
    "what's your name",
    "tell me a joke",
    "what time is it",
    "hello aria",
    "thank you",
    "that looks good",
    "I like it",
    "what can you do",
    "help me",
    "who made you",
    "you're awesome",
    "nice work",
    "perfect",
    "cool",
    "I don't know what I want",
    "can you sing a song",
    "what's the weather like",
    "tell me something interesting",
    "I'm bored",
    "good morning",
    "goodbye",
    "that's enough for now",
    "I need to think about it",
    "what do you think",
    "is this good",
    "how does this work",
    "explain the canvas to me",
    "what's a preset",
    "why is it not working",
]

# ── FunctionGemma Format Builder ─────────────────────────────────

def build_declaration(name: str, desc: str, params: Dict[str, str]) -> str:
    """Build a FunctionGemma function declaration string."""
    if not params:
        return f"<start_function_declaration>declaration:{name}{{description:<escape>{desc}<escape>,parameters:{{}}}}<end_function_declaration>"

    param_strs = ",".join(f"{k}:{{type:{v.upper()}}}" for k, v in params.items())
    return f"<start_function_declaration>declaration:{name}{{description:<escape>{desc}<escape>,parameters:{{{param_strs}}}}}<end_function_declaration>"


def build_function_call(name: str, args: Dict[str, Any]) -> str:
    """Build a FunctionGemma function call string."""
    if not args:
        return f"<start_function_call>call:{name}{{}}<end_function_call>"

    arg_strs = ",".join(
        f"{k}:<escape>{v}<escape>" if isinstance(v, str) else f"{k}:{json.dumps(v)}"
        for k, v in args.items()
    )
    return f"<start_function_call>call:{name}{{{arg_strs}}}<end_function_call>"


def build_example(utterance: str, func_name: str, args: Dict[str, Any],
                   available_functions: List[str]) -> str:
    """Build a complete FunctionGemma training example."""
    # Declarations
    decls = []
    for fn in available_functions:
        if fn in FUNCTIONS:
            f = FUNCTIONS[fn]
            decls.append(build_declaration(fn, f["description"], f["parameters"]))

    decl_block = "\n".join(decls)
    call_block = build_function_call(func_name, args)

    return (
        f"<start_of_turn>developer\n"
        f"You can call the following functions:\n"
        f"{decl_block}\n"
        f"<end_of_turn>\n"
        f"<start_of_turn>user\n"
        f"{utterance}\n"
        f"<end_of_turn>\n"
        f"<start_of_turn>model\n"
        f"{call_block}\n"
        f"<end_of_turn>"
    )


def build_negative_example(utterance: str, available_functions: List[str]) -> str:
    """Build a negative example (no function call — model responds with text)."""
    decls = []
    for fn in available_functions:
        if fn in FUNCTIONS:
            f = FUNCTIONS[fn]
            decls.append(build_declaration(fn, f["description"], f["parameters"]))

    decl_block = "\n".join(decls)

    # Random polite text response
    responses = [
        "I can help you with that! Try asking me to manipulate objects on the canvas.",
        "I'm here to help! I can move, resize, color, and animate objects.",
        "Sure thing! What would you like me to do with the objects?",
        "I appreciate that! Let me know if you need anything.",
        "Thanks! I'm ready for your next command.",
    ]

    return (
        f"<start_of_turn>developer\n"
        f"You can call the following functions:\n"
        f"{decl_block}\n"
        f"<end_of_turn>\n"
        f"<start_of_turn>user\n"
        f"{utterance}\n"
        f"<end_of_turn>\n"
        f"<start_of_turn>model\n"
        f"{random.choice(responses)}\n"
        f"<end_of_turn>"
    )


# ── Pipeline ─────────────────────────────────────────────────────

def generate_dataset():
    all_func_names = list(FUNCTIONS.keys())
    examples = []
    seen_hashes = set()

    def add_example(text: str):
        h = hashlib.md5(text.encode()).hexdigest()
        if h not in seen_hashes:
            seen_hashes.add(h)
            examples.append({"text": text})

    print(f"Functions: {len(FUNCTIONS)}")
    print(f"Generating examples...")

    # 1. Full function set examples (all functions declared)
    for func_name, func_data in FUNCTIONS.items():
        for utterance, args in func_data["utterances"]:
            text = build_example(utterance, func_name, args, all_func_names)
            add_example(text)

    full_count = len(examples)
    print(f"  Full-set examples: {full_count}")

    # 2. Subset variants (5 and 15 functions declared)
    for func_name, func_data in FUNCTIONS.items():
        for utterance, args in func_data["utterances"][:5]:  # 5 subset variants per function
            # Small subset (5 functions including the target)
            subset = [func_name] + random.sample([f for f in all_func_names if f != func_name], min(4, len(all_func_names) - 1))
            text = build_example(utterance, func_name, args, subset)
            add_example(text)

            # Medium subset (15 functions)
            subset = [func_name] + random.sample([f for f in all_func_names if f != func_name], min(14, len(all_func_names) - 1))
            text = build_example(utterance, func_name, args, subset)
            add_example(text)

    subset_count = len(examples) - full_count
    print(f"  Subset variants: {subset_count}")

    # 3. Negative examples
    neg_count_before = len(examples)
    for utterance in NEGATIVE_UTTERANCES:
        # With all functions
        text = build_negative_example(utterance, all_func_names)
        add_example(text)
        # With small subset
        subset = random.sample(all_func_names, 8)
        text = build_negative_example(utterance, subset)
        add_example(text)

    neg_count = len(examples) - neg_count_before
    print(f"  Negative examples: {neg_count}")

    # 4. Shuffle
    random.shuffle(examples)

    print(f"\nTotal unique examples: {len(examples)}")
    print(f"  Positive: {len(examples) - neg_count}")
    print(f"  Negative: {neg_count} ({neg_count * 100 // len(examples)}%)")

    return examples


def merge_with_existing(examples: List[Dict], existing_path: str) -> List[Dict]:
    """Merge with existing AI-LAB dataset if available."""
    if not os.path.exists(existing_path):
        print(f"No existing dataset at {existing_path}")
        return examples

    existing = []
    with open(existing_path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    existing.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    print(f"Existing dataset: {len(existing)} examples")

    # Merge and deduplicate
    seen = set()
    merged = []
    for ex in examples + existing:
        h = hashlib.md5(ex.get("text", "").encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            merged.append(ex)

    random.shuffle(merged)
    print(f"After merge + dedup: {len(merged)} examples")
    return merged


def export_dataset(examples: List[Dict], output_path: str):
    """Export as JSONL."""
    with open(output_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    size_kb = os.path.getsize(output_path) / 1024
    print(f"\nExported to: {output_path}")
    print(f"Size: {size_kb:.1f} KB")
    print(f"Examples: {len(examples)}")


def main():
    print("=" * 60)
    print("FunctionGemma Fine-Tuning Dataset Generator")
    print("=" * 60)

    # Generate
    examples = generate_dataset()

    # Try merge with existing AI-LAB dataset
    ailab_path = "/storage/self/primary/Download/gemini-3-pro/AI-LAB/data/finetune/core-functions-kg-functiongemma-484.jsonl"
    examples = merge_with_existing(examples, ailab_path)

    # Export
    output_dir = os.path.dirname(os.path.abspath(__file__))

    # Full dataset
    export_dataset(examples, os.path.join(output_dir, "su-lab-functiongemma-full.jsonl"))

    # Train/eval split (90/10)
    split = int(len(examples) * 0.9)
    train = examples[:split]
    eval_set = examples[split:]

    export_dataset(train, os.path.join(output_dir, "su-lab-functiongemma-train.jsonl"))
    export_dataset(eval_set, os.path.join(output_dir, "su-lab-functiongemma-eval.jsonl"))

    print(f"\nTrain: {len(train)} | Eval: {len(eval_set)}")
    print("Done!")


if __name__ == "__main__":
    main()
