#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <random>

struct Icon {
    float x, y, tx, ty, rot, scale, opacity, time;
    int id;
    Icon(int i, float px, float py) : x(px), y(py), tx(px), ty(py), rot(0), scale(1), opacity(0.3f), time(0), id(i) {}
};

class AnimationSystem {
    std::vector<Icon> icons;
    std::mt19937 rng{std::random_device{}()};
    float vw, vh, pad = 100.0f;

public:
    void setViewport(float w, float h) { vw = w; vh = h; }
    
    void addIcon(int id, float x, float y) {
        icons.emplace_back(id, x, y);
        auto& icon = icons.back();
        std::uniform_real_distribution<float> dist(0.6f, 1.0f);
        icon.scale = dist(rng);
        icon.rot = dist(rng) * 360.0f;
        icon.opacity = 0.3f + dist(rng) * 0.4f;
        newTarget(icon);
    }
    
    void newTarget(Icon& icon) {
        std::uniform_real_distribution<float> xd(pad, vw - pad), yd(pad, vh - pad);
        icon.tx = xd(rng);
        icon.ty = yd(rng);
    }
    
    void update(float dt) {
        for (auto& icon : icons) {
            icon.time += dt;
            
            float dx = icon.tx - icon.x, dy = icon.ty - icon.y;
            float dist = std::sqrt(dx*dx + dy*dy);
            
            if (dist > 5.0f) {
                float t = 1.0f - std::exp(-0.02f * dt * 60.0f);
                icon.x += dx * t;
                icon.y += dy * t;
            } else newTarget(icon);
            
            icon.rot += (icon.id * 10.0f - 50.0f) * dt;
            icon.scale = 0.7f + 0.3f * std::sin(icon.time * (0.5f + icon.id * 0.1f));
            icon.opacity = 0.2f + 0.3f * std::sin(icon.time * (0.3f + icon.id * 0.05f));
            
            icon.x = std::clamp(icon.x, pad, vw - pad);
            icon.y = std::clamp(icon.y, pad, vh - pad);
        }
    }
    
    emscripten::val getData() {
        auto result = emscripten::val::array();
        for (const auto& icon : icons) {
            auto data = emscripten::val::object();
            data.set("id", icon.id);
            data.set("x", icon.x);
            data.set("y", icon.y);
            data.set("rotation", icon.rot);
            data.set("scale", icon.scale);
            data.set("opacity", icon.opacity);
            result.call<void>("push", data);
        }
        return result;
    }
    
    void scroll(float progress) {
        for (auto& icon : icons) {
            float speed = 0.2f + icon.id * 0.1f;
            icon.y += progress * speed * 50.0f * 0.016f;
            icon.rot += progress * (icon.id + 1) * 2.0f * 0.016f;
        }
    }
    
    void resize(float w, float h) {
        float sx = w / vw, sy = h / vh;
        setViewport(w, h);
        for (auto& icon : icons) {
            icon.x = std::clamp(icon.x * sx, pad, w - pad);
            icon.y = std::clamp(icon.y * sy, pad, h - pad);
            icon.tx = std::clamp(icon.tx * sx, pad, w - pad);
            icon.ty = std::clamp(icon.ty * sy, pad, h - pad);
        }
    }
    
    void clear() { icons.clear(); }
};

static AnimationSystem sys;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void init(float w, float h) { sys.setViewport(w, h); }
    EMSCRIPTEN_KEEPALIVE void add(int id, float x, float y) { sys.addIcon(id, x, y); }
    EMSCRIPTEN_KEEPALIVE void update(float dt) { sys.update(dt); }
    EMSCRIPTEN_KEEPALIVE void scroll(float p) { sys.scroll(p); }
    EMSCRIPTEN_KEEPALIVE void resize(float w, float h) { sys.resize(w, h); }
    EMSCRIPTEN_KEEPALIVE void clear() { sys.clear(); }
}

EMSCRIPTEN_BINDINGS(animations) {
    emscripten::class_<AnimationSystem>("AnimationSystem")
        .function("setViewport", &AnimationSystem::setViewport)
        .function("addIcon", &AnimationSystem::addIcon)
        .function("update", &AnimationSystem::update)
        .function("getData", &AnimationSystem::getData)
        .function("scroll", &AnimationSystem::scroll)
        .function("resize", &AnimationSystem::resize)
        .function("clear", &AnimationSystem::clear);
}